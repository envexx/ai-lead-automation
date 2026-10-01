import { NextResponse } from "next/server";
import { runAutomation } from "@/core/engine";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await runAutomation(id, "manual");
    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      decision: result.decision,
      engine: result.understanding.engineLabel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
