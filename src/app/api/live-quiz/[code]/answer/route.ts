import { json, readJson, readQuizToken, submitAnswer, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    return json(await submitAnswer(code, readQuizToken(req), await readJson(req)));
  } catch (error) {
    return toResponse(error);
  }
}
