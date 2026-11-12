import {
  createQuiz,
  json,
  listQuizzes,
  readJson,
  requireAdminSession,
  toResponse,
} from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    return json(await listQuizzes());
  } catch (error) {
    return toResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    return json(await createQuiz(session, await readJson(req)));
  } catch (error) {
    return toResponse(error);
  }
}
