import { json, requireAdminSession, setupLiveQuizTables, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireAdminSession();
    const result = await setupLiveQuizTables();
    if (!result.ok) return json(result, 500);
    return json(result);
  } catch (error) {
    return toResponse(error);
  }
}
