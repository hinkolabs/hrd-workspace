import { NextResponse } from "next/server";
import { TRAINING_SCENARIOS } from "@/lib/training-scenarios";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scenario = TRAINING_SCENARIOS.find((s) => s.scenario_key === id);

  if (!scenario) {
    return NextResponse.json({ error: "시나리오를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ scenario });
}
