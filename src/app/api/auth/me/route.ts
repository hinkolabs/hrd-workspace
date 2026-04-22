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
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  // DB role takes priority; fall back to JWT role, then default to "admin" for backcompat
  const role: "admin" | "member" =
    dbUser?.role === "admin" || dbUser?.role === "member"
      ? dbUser.role
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
