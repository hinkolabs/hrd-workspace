"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Send, Loader2, Users, Crown, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import type { GrowthGroup, GrowthGroupMember, GrowthGroupPost } from "@/lib/growth-types";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export default function GroupBoardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [group, setGroup] = useState<GrowthGroup | null>(null);
  const [members, setMembers] = useState<GrowthGroupMember[]>([]);
  const [posts, setPosts] = useState<GrowthGroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, postsRes, membersRes] = await Promise.all([
        fetch("/api/growth/my-groups"),
        fetch(`/api/growth/groups/${id}/posts`),
        fetch(`/api/growth/groups/${id}/members`),
      ]);
      if (groupsRes.ok) {
        const groups: GrowthGroup[] = await groupsRes.json();
        setGroup(groups.find((g) => g.id === id) ?? null);
      }
      if (postsRes.ok) setPosts(await postsRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (user) load(); }, [user, load]);

  async function handlePost() {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/growth/groups/${id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        const post = await res.json();
        setPosts((prev) => [post, ...prev]);
        setContent("");
      } else {
        const data = await res.json();
        alert(data.error ?? "등록 실패");
      }
    } finally {
      setPosting(false);
    }
  }

  async function handleComment(postId: string, text: string) {
    const res = await fetch(`/api/growth/groups/${id}/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    if (res.ok) {
      const comment = await res.json();
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: [...(p.comments ?? []), comment], comment_count: (p.comment_count ?? 0) + 1 } : p))
      );
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/growth/groups")} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        {loading ? (
          <Loader2 size={16} className="animate-spin text-gray-300" />
        ) : group ? (
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{group.name}</h1>
            {group.description && <p className="text-xs text-gray-500 truncate">{group.description}</p>}
          </div>
        ) : (
          <p className="text-sm text-gray-400">그룹을 찾을 수 없습니다</p>
        )}
        <button
          onClick={() => setShowMembers((s) => !s)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors shrink-0"
        >
          <Users size={12} /> {group?.member_count ?? 0}명
        </button>
      </div>

      {showMembers && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex flex-wrap gap-1.5">
          {members.map((m) => (
            <span key={m.id} className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-full">
              {m.role === "leader" && <Crown size={10} className="text-amber-500" />}
              {m.display_name}
            </span>
          ))}
        </div>
      )}

      {/* 글쓰기 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="그룹 활동 기록을 남겨보세요..."
          rows={3}
          className="w-full text-sm resize-none focus:outline-none placeholder:text-gray-400"
        />
        <div className="flex justify-end">
          <button
            onClick={handlePost}
            disabled={!content.trim() || posting}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 hover:bg-indigo-700 transition-colors"
          >
            {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            게시
          </button>
        </div>
      </div>

      {/* 게시글 목록 */}
      {loading ? (
        <div className="flex justify-center py-10 text-gray-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
          <MessageCircle size={28} />
          <p className="text-sm">아직 등록된 게시글이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onComment={handleComment} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onComment }: { post: GrowthGroupPost; onComment: (postId: string, text: string) => void }) {
  const [commentInput, setCommentInput] = useState("");
  const [showComments, setShowComments] = useState(false);

  function submit() {
    if (!commentInput.trim()) return;
    onComment(post.id, commentInput.trim());
    setCommentInput("");
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
          {post.display_name?.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-800">{post.display_name}</p>
          <p className="text-[10px] text-gray-400">{timeAgo(post.created_at)}</p>
        </div>
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>

      <button
        onClick={() => setShowComments((s) => !s)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 mt-3 transition-colors"
      >
        <MessageCircle size={12} /> 댓글 {post.comment_count ?? post.comments?.length ?? 0}
      </button>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          {(post.comments ?? []).map((c) => (
            <div key={c.id} className="flex gap-2">
              <span className="text-xs font-semibold text-gray-700 shrink-0">{c.display_name}</span>
              <span className="text-xs text-gray-600">{c.content}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="댓글 남기기..."
              className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-full focus:outline-none focus:border-indigo-400"
            />
            <button onClick={submit} disabled={!commentInput.trim()} className="text-indigo-600 disabled:opacity-30">
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
