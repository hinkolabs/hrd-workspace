import { NextResponse } from "next/server";
import { TRAINING_SCENARIOS } from "@/lib/training-scenarios";

export async function GET() {
  return NextResponse.json({
    scenarios: TRAINING_SCENARIOS.map((s) => ({
      scenario_key: s.scenario_key,
      title: s.title,
      department: s.department,
      pain_point: s.pain_point,
      alli_app_type: s.alli_app_type,
      alli_nodes: s.alli_nodes,
      difficulty: s.difficulty,
      duration_minutes: s.duration_minutes,
      ice_impact: s.ice_impact,
      ice_confidence: s.ice_confidence,
      ice_ease: s.ice_ease,
      sort_order: s.sort_order,
      workflow_steps: s.workflow_steps.map((ws) => ({
        step: ws.step,
        title: ws.title,
      })),
    })),
  });
}
