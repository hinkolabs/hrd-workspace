import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Always fetch the role from DB — JWT may be stale after schema migration
  const supabase = createServerClient();
  // select("*") to avoid 42703 error when role column doesn't exist yet
  const { data: dbUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.userId)
    .single();

  // DB role takes priority; fall back to JWT role, then default to "admin" for backcompat
  const rawRole = (dbUser as Record<string, unknown> | null)?.role;
  const role: "admin" | "member" =
    rawRole === "admin" ? "admin"
    : rawRole === "member" ? "member"
    : (session.role ?? "admin");

  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      displayName: session.displayName,
      role,
    },
  });
}
