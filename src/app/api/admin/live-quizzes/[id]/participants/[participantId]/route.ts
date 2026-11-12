import { json, removeParticipant, requireAdminSession, toResponse } from "@/lib/live-quiz-server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> },
) {
  try {
    await requireAdminSession();
    const { id, participantId } = await params;
    return json(await removeParticipant(id, participantId));
  } catch (error) {
    return toResponse(error);
  }
}
