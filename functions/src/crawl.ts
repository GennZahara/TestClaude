import { XMLParser } from "fast-xml-parser";
import * as logger from "firebase-functions/logger";
import { admin, db } from "./admin";
import { Paper, PaperCategory } from "./types";

const CATEGORIES: PaperCategory[] = ["cs.GR", "cs.SD"];
const MAX_RESULTS = 50;

/**
 * 어제 날짜를 arXiv API 형식(YYYYMMDD)으로 반환
 */
function getYesterdayDateStr(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const year = yesterday.getUTCFullYear();
  const month = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * arXiv Atom 피드에서 논문 항목 파싱
 */
function parseArxivEntry(entry: Record<string, unknown>, category: PaperCategory): Paper {
  const rawId = entry.id as string;
  // id 형식: "http://arxiv.org/abs/2403.12345v1"
  const arxivId = rawId.split("/abs/")[1]?.replace(/v\d+$/, "") ?? rawId;
  const docId = arxivId.replace(/\//g, "_");

  // author: 단일 객체 또는 배열
  const authorRaw = entry.author as Record<string, string> | Array<Record<string, string>>;
  const authors = Array.isArray(authorRaw)
    ? authorRaw.map((a) => a.name ?? "")
    : [authorRaw?.name ?? "Unknown"];

  const title = String(entry.title ?? "").replace(/\s+/g, " ").trim();
  const abstract = String(entry.summary ?? "").replace(/\s+/g, " ").trim();
  const published = String(entry.published ?? new Date().toISOString());

  return {
    id: docId,
    arxivId,
    title,
    abstract,
    authors: authors.filter(Boolean),
    category,
    publishedDate: published,
    arxivUrl: `https://arxiv.org/abs/${arxivId}`,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
    status: "raw",
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };
}

/**
 * 특정 카테고리와 날짜의 arXiv 논문 목록 조회
 */
async function fetchArxivPapers(
  category: PaperCategory,
  dateStr: string
): Promise<Paper[]> {
  // arXiv API: submittedDate 범위 검색
  const searchQuery = `cat:${category}+AND+submittedDate:[${dateStr}000000+TO+${dateStr}235959]`;
  const url = `http://export.arxiv.org/api/query?search_query=${searchQuery}&max_results=${MAX_RESULTS}&sortBy=submittedDate&sortOrder=descending`;

  logger.info(`arXiv API 요청: ${category} (${dateStr})`);

  const response = await fetch(url, {
    headers: { "User-Agent": "arxiv-summarizer/1.0 (Firebase Cloud Functions)" },
  });

  if (!response.ok) {
    throw new Error(`arXiv API 오류 [${response.status}]: ${response.statusText}`);
  }

  const xmlText = await response.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    // 단일 항목도 항상 배열로 처리
    isArray: (name) => name === "entry" || name === "author" || name === "category",
  });

  const parsed = parser.parse(xmlText) as {
    feed?: {
      entry?: Array<Record<string, unknown>>;
      "opensearch:totalResults"?: number;
    };
  };

  const entries = parsed.feed?.entry ?? [];
  const totalResults = parsed.feed?.["opensearch:totalResults"] ?? 0;
  logger.info(`${category}: 전체 ${totalResults}건 중 ${entries.length}건 수신`);

  return entries.map((entry) => parseArxivEntry(entry, category));
}

/**
 * arXiv 크롤링 메인 함수 (Cloud Functions에서 호출)
 */
export async function crawlArxiv(dateStr?: string): Promise<{ stored: number; skipped: number }> {
  const targetDate = dateStr ?? getYesterdayDateStr();
  logger.info(`크롤링 날짜: ${targetDate}`);

  let stored = 0;
  let skipped = 0;

  for (const category of CATEGORIES) {
    let papers: Paper[] = [];

    try {
      papers = await fetchArxivPapers(category, targetDate);
    } catch (error) {
      logger.error(`${category} 크롤링 실패:`, error);
      continue;
    }

    if (papers.length === 0) {
      logger.warn(`${category}: 논문 없음 (날짜: ${targetDate})`);
      continue;
    }

    // Firestore batch write (최대 500건/배치)
    const BATCH_SIZE = 400;
    for (let i = 0; i < papers.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = papers.slice(i, i + BATCH_SIZE);

      for (const paper of chunk) {
        const docRef = db.collection("papers").doc(paper.id);
        const existing = await docRef.get();

        if (existing.exists) {
          skipped++;
        } else {
          batch.set(docRef, paper);
          stored++;
        }
      }

      await batch.commit();
    }

    logger.info(`${category}: ${papers.length}건 처리 (저장: ${stored}, 스킵: ${skipped})`);
  }

  logger.info(`크롤링 완료 — 저장: ${stored}, 스킵: ${skipped}`);
  return { stored, skipped };
}
