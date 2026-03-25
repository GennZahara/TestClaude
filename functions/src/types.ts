import { Timestamp } from "firebase-admin/firestore";

export type PaperCategory = "cs.GR" | "cs.SD";
export type PaperStatus = "raw" | "summarized" | "failed";

export interface Paper {
  id: string;            // arxivId에서 '/' → '_' 치환한 문서 ID
  arxivId: string;       // 예: "2403.12345"
  title: string;
  abstract: string;
  authors: string[];
  category: PaperCategory;
  publishedDate: string; // ISO 8601 날짜 문자열
  arxivUrl: string;
  pdfUrl: string;
  summary?: string;            // Claude가 생성한 한국어 요약
  applicationSample?: string;  // Claude가 생성한 적용 사례 + 샘플 코드
  status: PaperStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
