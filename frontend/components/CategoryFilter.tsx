"use client";

import type { CategoryFilter } from "@/lib/types";

interface CategoryFilterProps {
  selected: CategoryFilter;
  onChange: (category: CategoryFilter) => void;
  counts: { all: number; "cs.GR": number; "cs.SD": number };
}

const FILTERS: { value: CategoryFilter; label: string; color: string }[] = [
  {
    value: "all",
    label: "전체",
    color: "bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600",
  },
  {
    value: "cs.GR",
    label: "cs.GR · 컴퓨터 그래픽스",
    color:
      "bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20",
  },
  {
    value: "cs.SD",
    label: "cs.SD · 음향/음악 컴퓨팅",
    color:
      "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20",
  },
];

export default function CategoryFilterBar({
  selected,
  onChange,
  counts,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map(({ value, label, color }) => {
        const count = counts[value];
        const isActive = selected === value;

        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all
              ${color}
              ${isActive ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950" : ""}
            `}
          >
            {label}
            <span
              className={`
                inline-flex items-center justify-center w-5 h-5 rounded-full text-xs
                ${isActive ? "bg-white/20" : "bg-slate-800/60"}
              `}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
