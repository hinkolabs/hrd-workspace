import { createServerClient } from "@/lib/supabase-server";
import { quizVideoObjectPath } from "@/lib/live-quiz";

export const QUIZ_MEDIA_BUCKET = "quiz-media";
export const QUIZ_VIDEO_LIMIT = 40 * 1024 * 1024;

async function ensureQuizMediaBucket() {
  const supabase = createServerClient();
  const existing = await supabase.storage.getBucket(QUIZ_MEDIA_BUCKET);
  if (existing.data) return;
  const created = await supabase.storage.createBucket(QUIZ_MEDIA_BUCKET, {
    public: false,
    fileSizeLimit: QUIZ_VIDEO_LIMIT,
    allowedMimeTypes: ["video/mp4", "video/webm"],
  });
  if (created.error && !/already exists/i.test(created.error.message)) {
    throw new Error(created.error.message);
  }
}

export async function createQuizVideoUpload(contentType: string) {
  const extension = contentType === "video/mp4" ? "mp4" : contentType === "video/webm" ? "webm" : null;
  if (!extension) throw new Error("영상은 mp4 또는 webm만 올릴 수 있습니다.");
  await ensureQuizMediaBucket();
  const path = `clips/${crypto.randomUUID()}.${extension}`;
  const supabase = createServerClient();
  const { data, error } = await supabase.storage.from(QUIZ_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message || "영상 업로드 주소를 만들지 못했습니다.");
  return { signedUrl: data.signedUrl, ref: `storage:${QUIZ_MEDIA_BUCKET}/${path}` };
}

export async function signQuizVideo(ref: string) {
  const path = quizVideoObjectPath(ref);
  if (!path) return null;
  const supabase = createServerClient();
  const { data, error } = await supabase.storage.from(QUIZ_MEDIA_BUCKET).createSignedUrl(path, 60 * 30);
  if (error || !data?.signedUrl) throw new Error(error?.message || "영상을 열지 못했습니다.");
  return data.signedUrl;
}
