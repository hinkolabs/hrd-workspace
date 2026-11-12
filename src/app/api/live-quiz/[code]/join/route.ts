import { joinQuiz, json, readJson, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    return json(await joinQuiz(code, await readJson(req)));
  } catch (error) {
    return toResponse(error);
  }
}
