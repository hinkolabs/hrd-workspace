import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("knowledge_qa_history")
      .select("question, answer, sources, created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "히스토리 조회 실패" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from("knowledge_qa_history")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // 전체 삭제

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "히스토리 삭제 실패" },
      { status: 500 }
    );
  }
}
