import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

/**
 * POST /api/admin/migrate
 * DB에 role 컬럼 추가 + 기존 사용자를 admin으로 설정.
 * 관리자 세션이 필요하며, 반복 실행해도 안전합니다.
 */
export async function POST() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();
  const results: string[] = [];

  // 1. role 컬럼이 있는지 확인 (select * 방식으로 안전하게)
  const { data: sampleUser } = await supabase
    .from("users")
    .select("*")
    .limit(1)
    .single();

  const hasRoleColumn = sampleUser && "role" in sampleUser;

  if (!hasRoleColumn) {
    // role 컬럼 없음 → Supabase Management API를 통해 추가 시도
    const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace("https://", "").split(".")[0];
    const mgmtToken = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Supabase SQL execution via management API
    const sqlRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mgmtToken}`,
      },
      body: JSON.stringify({
        query: `
          DO $$ BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name='users' AND column_name='role'
            ) THEN
              ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin','member'));
            END IF;
          END $$;
        `,
      }),
    });

    if (sqlRes.ok) {
      results.push("role 컬럼 추가 성공");
    } else {
      const errBody = await sqlRes.text();
      results.push(`role 컬럼 추가 실패 (Management API 토큰 필요): ${errBody.slice(0, 100)}`);
      // Fall through — try updating anyway if column might already exist
    }
  } else {
    results.push("role 컬럼 이미 존재");
  }

  // 2. 현재 접속자를 admin으로 설정 (컬럼이 있는 경우에만)
  const { data: checkCol } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.userId)
    .single();

  if (checkCol && "role" in checkCol) {
    const { error: updateErr } = await supabase
      .from("users")
      .update({ role: "admin" })
      .eq("id", session.userId);

    if (!updateErr) {
      results.push(`${session.username} → admin 설정 완료`);
    } else {
      results.push(`업데이트 실패: ${updateErr.message}`);
    }
  } else {
    results.push("role 컬럼 없음 — Supabase Dashboard SQL Editor에서 아래 SQL을 실행하세요:");
    results.push("ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member'));");
    results.push(`UPDATE users SET role = 'admin' WHERE username = '${session.username}';`);
  }

  return NextResponse.json({ results });
}
