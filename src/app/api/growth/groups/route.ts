import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// GET /api/growth/groups
// Returns all distinct dept (group) values from growth_members + users
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();

  // growth_members 에서 dept 수집
  const { data: members } = await supabase
    .from("growth_members")
    .select("dept")
    .not("dept", "is", null);

  // users 테이블에도 dept 필드가 있을 수 있으므로 함께 수집
  const { data: users } = await supabase
    .from("users")
    .select("dept")
    .not("dept", "is", null);

  const deptSet = new Set<string>();

  for (const row of members ?? []) {
    const r = row as Record<string, unknown>;
    if (r.dept && typeof r.dept === "string" && r.dept.trim()) {
      deptSet.add(r.dept.trim());
    }
  }
  for (const row of users ?? []) {
    const r = row as Record<string, unknown>;
    if (r.dept && typeof r.dept === "string" && r.dept.trim()) {
      deptSet.add(r.dept.trim());
    }
  }

  const groups = Array.from(deptSet).sort((a, b) => a.localeCompare(b, "ko"));
  return NextResponse.json(groups);
}
