"use client";

import { ExternalLink, Trash2, Plus, FileCode, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

type ClonePage = { name: string; updatedAt: string | null; type?: "html" | "tsx" };

type Props = {
  pages: ClonePage[];
  selectedPage: string | null;
  onSelect: (name: string) => void;
  onDelete: (name: string) => void;
  onNewPage: () => void;
};

type GroupedPage = {
  base: string;
  versions: ClonePage[];
};

/** Parse pages into groups by base name.
 *  "loginForm_1", "loginForm_2" → base "loginForm", versions [_1, _2]
 *  "main" (no underscore+number suffix) → base "main", versions [main]
 */
function groupPages(pages: ClonePage[]): GroupedPage[] {
  const map = new Map<string, ClonePage[]>();

  for (const page of pages) {
    const m = page.name.match(/^(.+)_(\d+)$/);
    const base = m ? m[1] : page.name;
    if (!map.has(base)) map.set(base, []);
    map.get(base)!.push(page);
  }

  // Sort versions within each group by version number ascending
  const groups: GroupedPage[] = [];
  for (const [base, versions] of map.entries()) {
    versions.sort((a, b) => {
      const numA = parseInt(a.name.match(/_(\d+)$/)?.[1] ?? "0", 10);
      const numB = parseInt(b.name.match(/_(\d+)$/)?.[1] ?? "0", 10);
      return numA - numB;
    });
    groups.push({ base, versions });
  }

  // Sort groups by the most recent version's updatedAt
  groups.sort((a, b) => {
    const latestA = a.versions[a.versions.length - 1].updatedAt ?? "";
    const latestB = b.versions[b.versions.length - 1].updatedAt ?? "";
    return latestB.localeCompare(latestA);
  });

  return groups;
}

function VersionBadge({ name }: { name: string }) {
  const m = name.match(/_(\d+)$/);
  if (!m) return null;
  return (
    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-500 leading-none">
      v{m[1]}
    </span>
  );
}

export default function PageList({ pages, selectedPage, onSelect, onDelete, onNewPage }: Props) {
  const groups = groupPages(pages);
  // Track which groups are collapsed; default all expanded
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(base: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(base)) next.delete(base);
      else next.add(base);
      return next;
    });
  }

  return (
    <div className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          클론 페이지
        </span>
        <button
          onClick={onNewPage}
          className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-indigo-600 transition-colors"
          title="새 페이지 추가"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {groups.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <FileCode size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="text-xs text-gray-400">클론한 페이지가 없습니다</p>
            <button
              onClick={onNewPage}
              className="mt-3 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
            >
              첫 페이지 만들기
            </button>
          </div>
        ) : (
          groups.map((group) => {
            const isCollapsed = collapsed.has(group.base);
            const hasVersions = group.versions.length > 1 || group.versions[0].name !== group.base;

            return (
              <div key={group.base} className="mb-1">
                {/* Group header */}
                <button
                  onClick={() => hasVersions && toggleCollapse(group.base)}
                  className={`w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors ${
                    hasVersions ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  {hasVersions ? (
                    isCollapsed ? (
                      <ChevronRight size={11} className="shrink-0" />
                    ) : (
                      <ChevronDown size={11} className="shrink-0" />
                    )
                  ) : (
                    <span className="w-[11px]" />
                  )}
                  <span className="truncate">{group.base}</span>
                  {hasVersions && (
                    <span className="ml-auto shrink-0 text-[10px] font-normal text-gray-400 normal-case">
                      {group.versions.length}개
                    </span>
                  )}
                </button>

                {/* Versions */}
                {!isCollapsed &&
                  group.versions.map((page) => (
                    <div
                      key={page.name}
                      className={`group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors ${
                        selectedPage === page.name
                          ? "bg-indigo-100 text-indigo-700"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                      onClick={() => onSelect(page.name)}
                    >
                      <FileCode
                        size={12}
                        className={
                          selectedPage === page.name ? "text-indigo-500 shrink-0" : "text-gray-400 shrink-0"
                        }
                      />
                      <span className="flex-1 text-xs font-medium truncate flex items-center gap-1">
                        {page.name}
                        <VersionBadge name={page.name} />
                        {page.type === "html" && (
                          <span className="px-1 py-0.5 text-[9px] rounded bg-emerald-100 text-emerald-600 font-bold leading-none shrink-0">
                            HTML
                          </span>
                        )}
                      </span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={
                            page.type === "html"
                              ? `/api/ui-editor/html-preview/${page.name}`
                              : `/clone/${page.name}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-0.5 rounded hover:text-indigo-600 transition-colors"
                          title="새 탭에서 열기"
                        >
                          <ExternalLink size={11} />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`"${page.name}" 페이지를 삭제할까요?`))
                              onDelete(page.name);
                          }}
                          className="p-0.5 rounded hover:text-red-500 transition-colors"
                          title="삭제"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
