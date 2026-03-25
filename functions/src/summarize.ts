import { GoogleGenerativeAI } from "@google/generative-ai";
import * as logger from "firebase-functions/logger";
import { admin, db } from "./admin";
import { Paper } from "./types";

// 한 번에 요약할 최대 논문 수 (Cloud Functions 타임아웃 고려)
const BATCH_LIMIT = 15;

function buildPrompt(paper: Paper): string {
  const categoryLabel =
    paper.category === "cs.GR" ? "컴퓨터 그래픽스 (cs.GR)" : "음향/음악 컴퓨팅 (cs.SD)";

  return `다음 arXiv 논문을 분석해주세요.

**제목**: ${paper.title}
**저자**: ${paper.authors.join(", ")}
**카테고리**: ${categoryLabel}
**게재일**: ${paper.publishedDate}
**arXiv 링크**: ${paper.arxivUrl}

**초록**:
${paper.abstract}

---

아래 두 섹션을 반드시 포함해서 답변해주세요.

## 논문 요약
핵심 기여, 제안 방법론, 주요 실험 결과를 3~4 단락으로 한국어로 요약합니다. 기술 용어는 정확하게 쓰되 이해하기 쉽게 설명해주세요.

## 적용 사례 및 샘플 코드
이 연구를 실제로 활용할 수 있는 구체적인 사례 2~3가지를 제시하고, 그중 하나에 대한 간단한 Python 샘플 코드(또는 의사코드)를 작성해주세요. 코드에는 한국어 주석을 달아주세요.`;
}

const SYSTEM_INSTRUCTION = `당신은 컴퓨터 과학 최신 연구를 분석하는 전문가입니다.
cs.GR(컴퓨터 그래픽스)와 cs.SD(음향/음악 컴퓨팅) 분야의 논문을 정확하게 이해하고,
핵심 내용을 한국어로 요약하며 실용적인 적용 방안을 제시합니다.
모든 응답은 한국어로 작성하고, 마크다운 형식을 사용합니다.`;

/**
 * 단일 논문을 Gemini API로 요약
 */
async function summarizePaper(
  paper: Paper,
  genAI: GoogleGenerativeAI
): Promise<{ summary: string; applicationSample: string }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
    },
  });

  const result = await model.generateContent(buildPrompt(paper));
  const fullText = result.response.text();

  // 섹션 분리
  const summaryMatch = fullText.match(
    /##\s*논문\s*요약\s*\n([\s\S]*?)(?=##\s*적용\s*사례|$)/
  );
  const sampleMatch = fullText.match(
    /##\s*적용\s*사례\s*및\s*샘플\s*코드\s*\n([\s\S]*)$/
  );

  const summary = summaryMatch?.[1]?.trim() ?? fullText;
  const applicationSample = sampleMatch?.[1]?.trim() ?? "";

  return { summary, applicationSample };
}

/**
 * 요약 대기 중인 논문 일괄 처리 (Cloud Functions에서 호출)
 */
export async function summarizePapers(): Promise<{ succeeded: number; failed: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY 환경변수가 설정되지 않았습니다. " +
        "firebase functions:secrets:set GEMINI_API_KEY 로 설정해주세요."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // 'raw' 상태 논문 조회 (오래된 것 먼저)
  const snapshot = await db
    .collection("papers")
    .where("status", "==", "raw")
    .orderBy("publishedDate", "asc")
    .limit(BATCH_LIMIT)
    .get();

  if (snapshot.empty) {
    logger.info("요약 대기 논문 없음");
    return { succeeded: 0, failed: 0 };
  }

  logger.info(`요약 대상: ${snapshot.size}건`);

  let succeeded = 0;
  let failed = 0;

  for (const doc of snapshot.docs) {
    const paper = doc.data() as Paper;

    try {
      logger.info(`요약 시작: ${paper.arxivId} — ${paper.title.slice(0, 60)}...`);

      const { summary, applicationSample } = await summarizePaper(paper, genAI);

      await doc.ref.update({
        summary,
        applicationSample,
        status: "summarized",
        updatedAt: admin.firestore.Timestamp.now(),
      });

      succeeded++;
      logger.info(`요약 완료: ${paper.arxivId}`);
    } catch (error) {
      logger.error(`요약 실패: ${paper.arxivId}`, error);

      await doc.ref.update({
        status: "failed",
        updatedAt: admin.firestore.Timestamp.now(),
      });

      failed++;
    }
  }

  logger.info(`요약 완료 — 성공: ${succeeded}, 실패: ${failed}`);
  return { succeeded, failed };
}
