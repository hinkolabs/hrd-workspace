import { QuizHttpError, json, readJson, requireAdminSession, toResponse } from "@/lib/live-quiz-server";
import { QUIZ_VIDEO_LIMIT, createQuizVideoUpload, signQuizVideo } from "@/lib/quiz-video";

export const dynamic = "force-dynamic";

function mediaError(error: unknown) {
  if (error instanceof QuizHttpError) return toResponse(error);
  const message = error instanceof Error ? error.message : "영상을 처리하지 못했습니다.";
  return json({ error: message }, 400);
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = (await readJson(req)) as { contentType?: unknown; size?: unknown };
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const size = typeof body.size === "number" ? body.size : Number(body.size);
    if (!Number.isFinite(size) || size <= 0 || size > QUIZ_VIDEO_LIMIT) {
      throw new QuizHttpError(400, "영상은 40MB 이하만 올릴 수 있습니다.");
    }
    return json(await createQuizVideoUpload(contentType));
  } catch (error) {
    return mediaError(error);
  }
}

export async function GET(req: Request) {
  try {
    await requireAdminSession();
    const ref = new URL(req.url).searchParams.get("ref") ?? "";
    const videoUrl = await signQuizVideo(ref);
    if (!videoUrl) throw new QuizHttpError(400, "영상 경로가 올바르지 않습니다.");
    return json({ videoUrl });
  } catch (error) {
    return mediaError(error);
  }
}
