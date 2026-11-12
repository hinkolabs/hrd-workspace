import { json, overrideAnswer, readJson, requireAdminSession, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    return json(await overrideAnswer(id, await readJson(req), session.displayName));
  } catch (error) {
    return toResponse(error);
  }
}
