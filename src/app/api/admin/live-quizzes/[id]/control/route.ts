import { controlQuiz, json, readJson, requireAdminSession, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = (await readJson(req)) as { action?: unknown };
    return json(await controlQuiz(id, body.action, session.displayName));
  } catch (error) {
    return toResponse(error);
  }
}
