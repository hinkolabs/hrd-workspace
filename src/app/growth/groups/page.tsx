"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, Users, Loader2, Crown } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import type { GrowthGroup } from "@/lib/growth-types";

export default function GrowthGroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GrowthGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/growth/my-groups")
      .then((r) => r.json())
      .then((d) => setGroups(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FolderKanban size={20} className="text-indigo-600" /> 내 그룹
        </h1>
        <p className="text-sm text-gray-500 mt-1">모집 신청이 승인되면 해당 그룹의 게시판이 여기에 생성됩니다</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
          <FolderKanban size={32} />
          <p className="text-sm">아직 속한 그룹이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/growth/groups/${g.id}`}
              className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-sm font-bold text-gray-900 truncate">{g.name}</p>
                {g.my_role === "leader" && <Crown size={14} className="text-amber-500 shrink-0" />}
              </div>
              {g.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{g.description}</p>}
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Users size={11} /> {g.member_count ?? 0}명
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
