import { exportResults, requireAdminSession, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const file = await exportResults(id);
    return new Response(file.body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toResponse(error);
  }
}
