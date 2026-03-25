import type { Timestamp } from "firebase/firestore";

export type PaperCategory = "cs.GR" | "cs.SD";
export type PaperStatus = "raw" | "summarized" | "failed";

export interface Paper {
  id: string;
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  category: PaperCategory;
  publishedDate: string;
  arxivUrl: string;
  pdfUrl: string;
  summary?: string;
  applicationSample?: string;
  status: PaperStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CategoryFilter = "all" | PaperCategory;
