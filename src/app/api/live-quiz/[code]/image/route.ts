import { getQuestionImage, json, readQuizToken, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const questionId = new URL(req.url).searchParams.get("question") ?? "";
    return json(
      await getQuestionImage(code, readQuizToken(req), questionId, req.headers.get("x-quiz-view") === "screen"),
    );
  } catch (error) {
    return toResponse(error);
  }
}
