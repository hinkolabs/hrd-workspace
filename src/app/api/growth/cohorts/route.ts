import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";

// 기수(cohort) 개념은 UI/API에서 숨김 처리됨.
// 이 엔드포인트는 호환성을 위해 남겨두되 빈 배열을 반환합니다.
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  return NextResponse.json([]);
}

export async function POST() {
  return NextResponse.json({ error: "기수 기능은 더 이상 사용되지 않습니다" }, { status: 410 });
}
