"use client";

import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  ChevronRight,
  Search,
  ExternalLink,
  Loader2,
  Menu,
  X,
} from "lucide-react";

type GuideItem = {
  slug: string;
  title: string;
  category: string;
};

type GuideContent = {
  slug: string;
  title: string;
  category: string;
  content: string;
};

export default function AlliGuidePage() {
  const [guides, setGuides] = useState<GuideItem[]>([]);
  const [activeSlug, setActiveSlug] = useState("index");
  const [guideContent, setGuideContent] = useState<GuideContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/tools/alli-guide")
      .then((r) => r.json())
      .then((d) => setGuides(d.guides ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tools/alli-guide?slug=${activeSlug}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setGuideContent(d);
      })
      .finally(() => setLoading(false));
  }, [activeSlug]);

  const categories = useMemo(() => {
    const cats: Record<string, GuideItem[]> = {};
    for (const g of guides) {
      if (!cats[g.category]) cats[g.category] = [];
      cats[g.category].push(g);
    }
    return cats;
  }, [guides]);

  const filteredContent = useMemo(() => {
    if (!guideContent || !searchQuery.trim()) return guideContent?.content ?? "";
    return guideContent.content;
  }, [guideContent, searchQuery]);

  const matchingGuides = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return guides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
    );
  }, [searchQuery, guides]);

  function handleGuideClick(slug: string) {
    setActiveSlug(slug);
    setSearchQuery("");
    setSidebarOpen(false);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <BookOpen size={16} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Alli Works 가이드
              </h1>
              <p className="text-xs text-gray-500">
                Alli Works 기능별 상세 가이드 문서
              </p>
            </div>
          </div>
          <a
            href="https://docs.allganize.ai/allganize-alli-works"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-200"
          >
            <ExternalLink size={12} />
            공식 문서 바로가기
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 fixed md:static inset-y-0 left-0 z-30 w-72 md:w-64 bg-white border-r border-gray-200 flex flex-col transition-transform md:transition-none pt-14 md:pt-0`}
        >
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="가이드 검색..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
            </div>
          </div>

          {/* Search results */}
          {matchingGuides && (
            <div className="p-3 border-b border-gray-100 bg-violet-50/50">
              <p className="text-[10px] font-semibold text-violet-600 mb-2">
                검색 결과 ({matchingGuides.length}건)
              </p>
              {matchingGuides.map((g) => (
                <button
                  key={g.slug}
                  onClick={() => handleGuideClick(g.slug)}
                  className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-violet-100 rounded-lg mb-0.5"
                >
                  {g.title}
                </button>
              ))}
            </div>
          )}

          {/* Category tree */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-4">
            {Object.entries(categories).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 mb-1.5">
                  {cat}
                </p>
                <div className="space-y-0.5">
                  {items.map((g) => {
                    const isActive = activeSlug === g.slug;
                    return (
                      <button
                        key={g.slug}
                        onClick={() => handleGuideClick(g.slug)}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                          isActive
                            ? "bg-violet-100 text-violet-800 font-semibold"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <ChevronRight
                          size={10}
                          className={
                            isActive ? "text-violet-500" : "text-gray-300"
                          }
                        />
                        <span className="truncate">{g.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-20 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-violet-500" />
            </div>
          ) : guideContent ? (
            <div className="max-w-4xl mx-auto p-4 sm:p-8">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
                <div className="prose prose-sm prose-gray max-w-none
                  prose-headings:text-gray-900
                  prose-h1:text-xl prose-h1:font-bold prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-3 prose-h1:mb-6
                  prose-h2:text-base prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
                  prose-h3:text-sm prose-h3:font-bold prose-h3:mt-6 prose-h3:mb-3
                  prose-p:text-xs prose-p:leading-relaxed prose-p:text-gray-700
                  prose-li:text-xs prose-li:text-gray-700
                  prose-table:text-xs
                  prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-gray-700
                  prose-td:px-3 prose-td:py-2 prose-td:border-gray-200
                  prose-code:text-violet-700 prose-code:bg-violet-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[11px]
                  prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:text-xs
                  prose-a:text-violet-600 prose-a:no-underline hover:prose-a:text-violet-800
                  prose-blockquote:border-violet-300 prose-blockquote:bg-violet-50/50 prose-blockquote:rounded-r-lg prose-blockquote:py-1
                  prose-strong:text-gray-900
                  prose-hr:border-gray-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {filteredContent}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Bottom navigation */}
              <div className="mt-6 flex items-center justify-between">
                {(() => {
                  const currentIdx = guides.findIndex(
                    (g) => g.slug === activeSlug
                  );
                  const prev = currentIdx > 0 ? guides[currentIdx - 1] : null;
                  const next =
                    currentIdx < guides.length - 1
                      ? guides[currentIdx + 1]
                      : null;
                  return (
                    <>
                      {prev ? (
                        <button
                          onClick={() => handleGuideClick(prev.slug)}
                          className="text-xs text-gray-500 hover:text-violet-600 flex items-center gap-1"
                        >
                          <ChevronRight size={12} className="rotate-180" />
                          {prev.title}
                        </button>
                      ) : (
                        <div />
                      )}
                      {next ? (
                        <button
                          onClick={() => handleGuideClick(next.slug)}
                          className="text-xs text-gray-500 hover:text-violet-600 flex items-center gap-1"
                        >
                          {next.title}
                          <ChevronRight size={12} />
                        </button>
                      ) : (
                        <div />
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              가이드를 선택해주세요
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
