import "./admin"; // Firebase Admin 초기화
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { crawlArxiv } from "./crawl";
import { summarizePapers } from "./summarize";

const REGION = "asia-northeast3"; // 서울 리전
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// ─── 스케줄 함수 ──────────────────────────────────────────────────────────────

/**
 * 매일 UTC 00:00 (KST 09:00) — arXiv 어제 논문 크롤링
 * cs.GR, cs.SD 카테고리 자동 수집
 */
export const scheduledCrawl = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "UTC",
    region: REGION,
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async () => {
    logger.info("스케줄 크롤링 시작");
    const result = await crawlArxiv();
    logger.info(`크롤링 완료: 저장 ${result.stored}건, 스킵 ${result.skipped}건`);
  }
);

/**
 * 매일 UTC 00:30 (KST 09:30) — Claude API로 논문 요약
 * 크롤링 30분 후 실행
 */
export const scheduledSummarize = onSchedule(
  {
    schedule: "30 0 * * *",
    timeZone: "UTC",
    region: REGION,
    timeoutSeconds: 540, // 9분 (최대 9분 실행)
    memory: "512MiB",
    secrets: [geminiApiKey],
  },
  async () => {
    logger.info("스케줄 요약 시작");
    const result = await summarizePapers();
    logger.info(`요약 완료: 성공 ${result.succeeded}건, 실패 ${result.failed}건`);
  }
);

// ─── HTTP 트리거 (수동 테스트 / 에뮬레이터용) ─────────────────────────────────

/**
 * 수동 크롤링 트리거
 * GET /manualCrawl?date=20260324 (date 파라미터 선택)
 */
export const manualCrawl = onRequest(
  { region: REGION, timeoutSeconds: 300, cors: true },
  async (req, res) => {
    try {
      const dateStr = req.query.date as string | undefined;
      const result = await crawlArxiv(dateStr);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error("수동 크롤링 실패:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  }
);

/**
 * 수동 요약 트리거
 * POST /manualSummarize
 */
export const manualSummarize = onRequest(
  {
    region: REGION,
    timeoutSeconds: 540,
    memory: "512MiB",
    cors: true,
    secrets: [geminiApiKey],
  },
  async (req, res) => {
    try {
      const result = await summarizePapers();
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error("수동 요약 실패:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  }
);
