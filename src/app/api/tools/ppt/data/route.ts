import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createServerClient();

    const [{ data: reports }, { data: estimates }] = await Promise.all([
      supabase
        .from("reports")
        .select("id, title, content, report_type, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("estimate_analyses")
        .select("id, title, file_name, result, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      reports: reports || [],
      estimates: estimates || [],
    });
  } catch (err) {
    console.error("[ppt/data]", err);
    return NextResponse.json({ reports: [], estimates: [] });
  }
}
