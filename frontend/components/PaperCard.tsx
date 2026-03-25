"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Paper } from "@/lib/types";

interface PaperCardProps {
  paper: Paper;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function StatusBadge({ status }: { status: Paper["status"] }) {
  if (status === "summarized") return null;
  if (status === "raw") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        요약 대기
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20">
      요약 실패
    </span>
  );
}

export default function PaperCard({ paper }: PaperCardProps) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);

  const isSummarized = paper.status === "summarized";
  const isGR = paper.category === "cs.GR";

  return (
    <article className="card group">
      {/* 상단 메타 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={isGR ? "badge-gr" : "badge-sd"}>
            {paper.category}
          </span>
          <StatusBadge status={paper.status} />
        </div>
        <time className="text-xs text-slate-500 shrink-0">
          {formatDate(paper.publishedDate)}
        </time>
      </div>

      {/* 제목 */}
      <h2 className="text-base font-semibold text-slate-100 leading-snug mb-2 group-hover:text-indigo-300 transition-colors">
        {paper.title}
      </h2>

      {/* 저자 */}
      <p className="text-xs text-slate-500 mb-4 line-clamp-1">
        {paper.authors.slice(0, 5).join(", ")}
        {paper.authors.length > 5 && ` 외 ${paper.authors.length - 5}명`}
      </p>

      {/* 초록 (접히는 형태) */}
      <details className="mb-4">
        <summary className="text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer select-none">
          초록 보기
        </summary>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          {paper.abstract}
        </p>
      </details>

      {/* Claude 요약 */}
      {isSummarized && paper.summary && (
        <div className="border-t border-slate-800 pt-4 mb-4">
          <button
            onClick={() => setSummaryOpen((v) => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              📝 Claude 요약
            </span>
            <svg
              className={`w-4 h-4 text-slate-500 ml-auto transition-transform ${
                summaryOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {summaryOpen && (
            <div className="mt-3 markdown-content text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {paper.summary}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* 적용 사례 및 샘플 코드 */}
      {isSummarized && paper.applicationSample && (
        <div className="border-t border-slate-800 pt-4 mb-4">
          <button
            onClick={() => setSampleOpen((v) => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              💡 적용 사례 & 샘플 코드
            </span>
            <svg
              className={`w-4 h-4 text-slate-500 ml-auto transition-transform ${
                sampleOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {sampleOpen && (
            <div className="mt-3 markdown-content text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {paper.applicationSample}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* 링크 */}
      <div className="flex gap-3 mt-auto pt-2">
        <a
          href={paper.arxivUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          arXiv 페이지 →
        </a>
        <a
          href={paper.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          PDF →
        </a>
      </div>
    </article>
  );
}
