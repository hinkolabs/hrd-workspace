import { json } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function POST() {
  return json({ error: "조는 입장한 뒤에 바꿀 수 없습니다" }, 409);
}
