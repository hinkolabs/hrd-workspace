"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  Download,
  Clock,
  Users,
  Loader2,
  CheckSquare,
  Presentation,
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import PDF download button (client-only, no SSR)
const PDFDownloadButton = dynamic(
  () => import("@/components/curriculum-pdf").then((m) => m.PDFDownloadButton),
  { ssr: false, loading: () => (
    <button disabled className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-400 rounded-xl text-sm cursor-not-allowed">
      <Loader2 size={15} className="animate-spin" />
      로딩 중...
    </button>
  )}
);

export default function CurriculumPage() {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tools/alli-guide?slug=curriculum-3h")
      .then((r) => r.json())
      .then((d) => setContent(d.content ?? ""))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 shrink-0">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <Presentation size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">
                Alli Works 교육 강의안
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                자격증 Q&A 챗봇 실습 중심 · 3시간 과정
              </p>
            </div>
          </div>

          {/* Stats + Download */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
              <Clock size={12} />
              180분
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
              <Users size={12} />
              10~20명
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
              <BookOpen size={12} />
              7개 세션
            </div>
            <PDFDownloadButton />
          </div>
        </div>

        {/* Session timeline */}
        <div className="max-w-4xl mx-auto mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {[
            { time: "00:00", label: "소개", color: "bg-blue-500" },
            { time: "00:25", label: "대시보드", color: "bg-cyan-500" },
            { time: "00:55", label: "지식베이스", color: "bg-teal-500" },
            { time: "01:20", label: "챗봇 제작", color: "bg-violet-600" },
            { time: "02:10", label: "조건+담당자", color: "bg-amber-500" },
            { time: "02:35", label: "테스트", color: "bg-emerald-500" },
            { time: "02:50", label: "마무리", color: "bg-gray-500" },
          ].map((s) => (
            <div key={s.time} className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-2 py-1.5 shadow-sm">
              <div className={`w-1.5 h-1.5 rounded-full ${s.color} shrink-0`} />
              <div>
                <p className="text-[9px] text-gray-400">{s.time}</p>
                <p className="text-[10px] font-medium text-gray-700">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
              <div className="prose prose-sm prose-gray max-w-none
                prose-headings:font-bold
                prose-h1:text-xl prose-h1:text-gray-900 prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-3 prose-h1:mb-6
                prose-h2:text-base prose-h2:text-indigo-700 prose-h2:mt-8 prose-h2:mb-3
                prose-h3:text-sm prose-h3:text-gray-800 prose-h3:mt-6 prose-h3:mb-2
                prose-h4:text-xs prose-h4:text-gray-700 prose-h4:mt-4 prose-h4:mb-1.5
                prose-p:text-gray-700 prose-p:leading-relaxed
                prose-li:text-gray-700 prose-li:leading-relaxed
                prose-strong:text-gray-900
                prose-code:text-violet-700 prose-code:bg-violet-50 prose-code:px-1 prose-code:rounded prose-code:text-xs
                prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-xl prose-pre:text-xs
                prose-table:text-xs prose-table:w-full
                prose-th:bg-gray-50 prose-th:text-gray-700 prose-th:font-semibold prose-th:px-3 prose-th:py-2
                prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-gray-100
                prose-blockquote:border-l-4 prose-blockquote:border-violet-300 prose-blockquote:bg-violet-50 prose-blockquote:rounded-r-lg prose-blockquote:py-1
              ">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    input: ({ ...props }) => (
                      <input
                        type="checkbox"
                        {...props}
                        className="rounded border-gray-300 text-violet-600 mr-2"
                      />
                    ),
                    li: ({ children, ...props }) => (
                      <li className="flex items-start gap-1" {...props}>
                        <CheckSquare size={12} className="text-violet-400 mt-1 shrink-0 hidden" />
                        {children}
                      </li>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <PDFDownloadButton />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
