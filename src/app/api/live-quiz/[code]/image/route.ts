import { getQuestionImage, json, readQuizToken, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const url = new URL(req.url);
    const questionId = url.searchParams.get("question") ?? "";
    const optionId = url.searchParams.get("option") ?? "";
    return json(
      await getQuestionImage(code, readQuizToken(req), questionId, req.headers.get("x-quiz-view") === "screen", optionId),
    );
  } catch (error) {
    return toResponse(error);
  }
}
