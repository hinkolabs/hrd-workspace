import { json, publishQuiz, requireAdminSession, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;
    return json(await publishQuiz(id));
  } catch (error) {
    return toResponse(error);
  }
}
