import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";
import { buildMandalartExportWorkbook } from "@/lib/mandalart-export";
import { ensureLastLoginColumn } from "@/lib/last-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  }

  try {
    await ensureLastLoginColumn();
    const supabase = createServerClient();
    const { bytes, filename } = await buildMandalartExportWorkbook(supabase);
    const encoded = encodeURIComponent(filename);

    return new NextResponse(Buffer.from(bytes) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="mandalart-all.xlsx"; filename*=UTF-8''${encoded}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "엑셀 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
