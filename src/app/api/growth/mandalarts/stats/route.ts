import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

const STOPWORDS = new Set([
  "하다", "되다", "있다", "없다", "이다", "그리고", "하고", "또한", "위해", "위한",
  "통해", "통한", "대한", "관한", "으로", "에서", "에게", "부터", "까지", "처럼",
  "같은", "같이", "이런", "저런", "이것", "저것", "그것", "어떤", "모든", "많은",
  "좋은", "나쁜", "크게", "작게", "빠르게", "잘", "더", "덜", "매우", "정말",
  "이를", "그를", "나를", "우리", "저를", "그게", "이게", "것을", "것이", "것은",
]);

function tokenize(text: string): string[] {
  return text
    .split(/[\s,./!?;:'"()\[\]{}<>·\-–—]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

// GET /api/growth/mandalarts/stats
export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohort_id");

  const supabase = createServerClient();

  // Fetch all public mandalarts
  let mQuery = supabase
    .from("growth_mandalarts")
    .select("id")
    .eq("visibility", "cohort");
  if (cohortId) mQuery = mQuery.eq("cohort_id", cohortId);
  const { data: mandalarts } = await mQuery;

  const mandalartIds = (mandalarts ?? []).map((m: { id: string }) => m.id);
  const totalMandalarts = mandalartIds.length;

  if (totalMandalarts === 0) {
    return NextResponse.json({
      words: [],
      totals: { mandalarts: 0, cells_filled: 0, cells_done: 0, todos: 0, todos_done: 0 },
    });
  }

  // Fetch all cells
  const { data: cells } = await supabase
    .from("growth_mandalart_cells")
    .select("id, text, done")
    .in("mandalart_id", mandalartIds);

  const cellList = cells ?? [];
  const cellIds = cellList.map((c: { id: string }) => c.id);
  const cellsFilled = cellList.filter((c: { text: string }) => c.text && c.text.trim().length > 0).length;
  const cellsDone = cellList.filter((c: { done: boolean }) => c.done).length;

  // Fetch all todos
  let todoList: Array<{ text: string; done: boolean }> = [];
  if (cellIds.length > 0) {
    const { data: todos } = await supabase
      .from("growth_mandalart_cell_todos")
      .select("text, done")
      .in("cell_id", cellIds);
    todoList = todos ?? [];
  }

  const totalTodos = todoList.length;
  const todosDone = todoList.filter((t) => t.done).length;

  // Word frequency from cell texts + todo texts
  const freq: Record<string, number> = {};
  const allTexts = [
    ...cellList.map((c: { text: string }) => c.text ?? ""),
    ...todoList.map((t) => t.text ?? ""),
  ];
  for (const text of allTexts) {
    for (const token of tokenize(text)) {
      freq[token] = (freq[token] ?? 0) + 1;
    }
  }

  // Top 50 words with normalized weight
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  const maxCount = sorted[0]?.[1] ?? 1;
  const words = sorted.map(([text, count]) => ({
    text,
    weight: Math.round((count / maxCount) * 100) / 100,
    count,
  }));

  return NextResponse.json({
    words,
    totals: {
      mandalarts: totalMandalarts,
      cells_filled: cellsFilled,
      cells_done: cellsDone,
      todos: totalTodos,
      todos_done: todosDone,
    },
  });
}
