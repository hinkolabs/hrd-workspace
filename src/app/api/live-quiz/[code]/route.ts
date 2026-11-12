import { getPublicState, json, readQuizToken, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    return json(await getPublicState(code, readQuizToken(req), req.headers.get("x-quiz-view") === "screen"));
  } catch (error) {
    return toResponse(error);
  }
}
