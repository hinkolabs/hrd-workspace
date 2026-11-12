import { json, patchQuestion, readJson, requireAdminSession, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = (await readJson(req)) as { questionId?: unknown };
    if (typeof body.questionId !== "string") return json({ error: "문제를 지정하세요" }, 400);
    return json(await patchQuestion(id, body.questionId, body));
  } catch (error) {
    return toResponse(error);
  }
}
