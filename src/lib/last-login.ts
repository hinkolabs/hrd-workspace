import type { SupabaseClient } from "@supabase/supabase-js";

const TOUCH_THROTTLE_MS = 5 * 60 * 1000;
let ensureAttempted = false;

/** last_login_at 컬럼이 없으면 한 번만 추가를 시도한다. 실패해도 기능은 빈 값으로 동작한다. */
export async function ensureLastLoginColumn(): Promise<void> {
  if (ensureAttempted) return;
  ensureAttempted = true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const projectRef = url.replace("https://", "").split(".")[0];
  if (!projectRef || !serviceKey) return;
  try {
    await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        query:
          "alter table users add column if not exists last_login_at timestamptz; notify pgrst, 'reload schema';",
      }),
    });
  } catch {
    /* Management API 토큰이 없으면 관리자 마이그레이션으로 추가 */
  }
}

function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    msg.includes("last_login_at")
  );
}

/** 실제 로그인 시각은 항상 갱신한다. 컬럼이 아직 없으면 조용히 건너뛴다. */
export async function stampLastLogin(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", userId);
  if (error && isMissingColumn(error)) {
    await ensureLastLoginColumn();
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);
    return;
  }
  if (error) {
    console.warn("[last-login] stamp failed:", error.message);
  }
}

/**
 * 페이지 로드(/api/auth/me)마다 접속 시각을 갱신하되, 5분에 한 번만 쓴다.
 * last_login_at 컬럼이 없으면 아무 것도 하지 않는다.
 */
export async function touchLastLogin(
  supabase: SupabaseClient,
  userId: string,
  current?: string | null
): Promise<void> {
  if (current) {
    const t = new Date(current).getTime();
    if (!Number.isNaN(t) && Date.now() - t < TOUCH_THROTTLE_MS) return;
  }
  await stampLastLogin(supabase, userId);
}
