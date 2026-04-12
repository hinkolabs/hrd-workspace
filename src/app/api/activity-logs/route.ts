import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const supabase = createServerClient();
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "100");
  const entity_type = url.searchParams.get("entity_type");

  let query = supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (entity_type) {
    query = query.eq("entity_type", entity_type);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
