import {
  deleteQuiz,
  getAdminQuiz,
  json,
  readJson,
  requireAdminSession,
  toResponse,
  updateQuiz,
} from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;
    return json(await getAdminQuiz(id));
  } catch (error) {
    return toResponse(error);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;
    return json(await updateQuiz(id, await readJson(req)));
  } catch (error) {
    return toResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;
    return json(await deleteQuiz(id));
  } catch (error) {
    return toResponse(error);
  }
}
