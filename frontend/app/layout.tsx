import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "arXiv 논문 요약 | cs.GR & cs.SD",
  description:
    "컴퓨터 그래픽스(cs.GR)와 음향/음악 컴퓨팅(cs.SD) 분야 최신 arXiv 논문을 Claude AI로 자동 요약합니다.",
  keywords: ["arXiv", "논문 요약", "컴퓨터 그래픽스", "음향 컴퓨팅", "AI", "Claude"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950">
        {/* 헤더 */}
        <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                aX
              </div>
              <div>
                <h1 className="text-sm font-semibold text-slate-100">arXiv 논문 요약</h1>
                <p className="text-xs text-slate-500">cs.GR · cs.SD · powered by Claude</p>
              </div>
            </div>
            <a
              href="https://arxiv.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              arXiv.org →
            </a>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>

        {/* 푸터 */}
        <footer className="border-t border-slate-800 mt-16">
          <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-slate-600">
            논문 데이터 출처: arXiv.org · 요약: Anthropic Claude API · 인프라: Firebase
          </div>
        </footer>
      </body>
    </html>
  );
}
