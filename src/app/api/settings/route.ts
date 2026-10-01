import { NextResponse } from "next/server";
import { z } from "zod";
import { getRulesConfig, setRulesConfig } from "@/core/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const rules = await getRulesConfig();
  return NextResponse.json({ rules });
}

const RulesSchema = z.object({
  hotThreshold: z.number().int().min(1).max(100).optional(),
  warmThreshold: z.number().int().min(0).max(99).optional(),
  minBudgetUsd: z.number().int().min(0).max(1000000).optional(),
  idealCompanySize: z.number().int().min(1).max(100000).optional(),
  autoReply: z.boolean().optional(),
  requireApprovalForHot: z.boolean().optional(),
  notifyChannel: z.string().trim().max(60).optional(),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = RulesSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings payload" }, { status: 422 });
  }

  const current = await getRulesConfig();
  if (
    parsed.data.hotThreshold !== undefined &&
    parsed.data.warmThreshold !== undefined &&
    parsed.data.warmThreshold >= parsed.data.hotThreshold
  ) {
    return NextResponse.json(
      { error: "Warm threshold must stay below the hot threshold" },
      { status: 422 },
    );
  }

  const rules = await setRulesConfig(parsed.data);
  return NextResponse.json({ rules, previous: current });
}
