import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const supabase = createServerClient();
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "100");

  const { data, error } = await supabase
    .from("convert_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
