"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Paper, CategoryFilter } from "@/lib/types";
import PaperCard from "@/components/PaperCard";
import CategoryFilterBar from "@/components/CategoryFilter";

// 최근 N일간 논문 표시
const DAYS_RANGE = 7;
const MAX_PAPERS = 100;

function getDateNDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

type LoadState = "loading" | "loaded" | "error";

export default function HomePage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sortBy, setSortBy] = useState<"date" | "status">("date");

  useEffect(() => {
    const cutoff = getDateNDaysAgo(DAYS_RANGE);

    // Firestore 실시간 구독: 최근 7일간 논문
    const q = query(
      collection(db, "papers"),
      where("publishedDate", ">=", cutoff),
      orderBy("publishedDate", "desc"),
      limit(MAX_PAPERS)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Paper[];
        setPapers(fetched);
        setLoadState("loaded");
      },
      (error) => {
        console.error("Firestore 구독 오류:", error);
        setLoadState("error");
      }
    );

    return () => unsubscribe();
  }, []);

  // 카테고리 필터링 및 정렬
  const filteredPapers = papers
    .filter((p) => categoryFilter === "all" || p.category === categoryFilter)
    .sort((a, b) => {
      if (sortBy === "status") {
        const statusOrder: Record<string, number> = {
          summarized: 0,
          raw: 1,
          failed: 2,
        };
        const statusDiff =
          (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
        if (statusDiff !== 0) return statusDiff;
      }
      return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
    });

  // 카테고리별 개수 집계
  const counts = {
    all: papers.length,
    "cs.GR": papers.filter((p) => p.category === "cs.GR").length,
    "cs.SD": papers.filter((p) => p.category === "cs.SD").length,
  };

  const summarizedCount = papers.filter((p) => p.status === "summarized").length;

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">최신 논문</h2>
        <p className="text-slate-500 text-sm">
          최근 {DAYS_RANGE}일간 arXiv에 게재된 cs.GR · cs.SD 논문 자동 요약
        </p>

        {/* 통계 뱃지 */}
        {loadState === "loaded" && (
          <div className="flex gap-3 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-lg px-3 py-1.5 text-xs text-slate-400">
              <span className="text-slate-200 font-semibold">{papers.length}</span>
              논문 수집
            </div>
            <div className="flex items-center gap-1.5 bg-indigo-500/10 rounded-lg px-3 py-1.5 text-xs text-indigo-400 border border-indigo-500/20">
              <span className="text-indigo-200 font-semibold">{summarizedCount}</span>
              요약 완료
            </div>
            {papers.filter((p) => p.status === "raw").length > 0 && (
              <div className="flex items-center gap-1.5 bg-yellow-500/10 rounded-lg px-3 py-1.5 text-xs text-yellow-400 border border-yellow-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-yellow-200 font-semibold">
                  {papers.filter((p) => p.status === "raw").length}
                </span>
                요약 대기
              </div>
            )}
          </div>
        )}
      </div>

      {/* 필터 & 정렬 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <CategoryFilterBar
          selected={categoryFilter}
          onChange={setCategoryFilter}
          counts={counts}
        />
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-500">정렬:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "status")}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="date">날짜순</option>
            <option value="status">요약 완료 우선</option>
          </select>
        </div>
      </div>

      {/* 콘텐츠 */}
      {loadState === "loading" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card animate-pulse"
            >
              <div className="h-4 bg-slate-800 rounded w-1/4 mb-3" />
              <div className="h-5 bg-slate-800 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-800 rounded w-1/2 mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-800 rounded" />
                <div className="h-3 bg-slate-800 rounded w-5/6" />
                <div className="h-3 bg-slate-800 rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {loadState === "error" && (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-slate-400">데이터를 불러오는 중 오류가 발생했습니다.</p>
          <p className="text-slate-500 text-sm mt-1">
            Firebase 설정(.env.local)을 확인해주세요.
          </p>
        </div>
      )}

      {loadState === "loaded" && filteredPapers.length === 0 && (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-400">
            {papers.length === 0
              ? "최근 7일간 수집된 논문이 없습니다."
              : "선택한 카테고리에 논문이 없습니다."}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Cloud Functions의 manualCrawl 함수를 실행하여 데이터를 수집해주세요.
          </p>
        </div>
      )}

      {loadState === "loaded" && filteredPapers.length > 0 && (
        <>
          <p className="text-xs text-slate-600 mb-4">
            {filteredPapers.length}건 표시
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPapers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
