import { NextResponse } from "next/server";
import { z } from "zod";
import { intakeLead } from "@/core/engine";

export const dynamic = "force-dynamic";

// Inbound lead webhook. Point a form, CRM, or Zapier step at this endpoint.
const WebhookSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().max(200).optional(),
  company: z.string().trim().max(160).optional(),
  companySize: z.coerce.number().int().positive().optional(),
  budgetUsd: z.coerce.number().int().nonnegative().optional(),
  message: z.string().trim().min(1).max(4000),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = WebhookSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid webhook payload", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const result = await intakeLead({ ...parsed.data, source: "webhook" });
  return NextResponse.json(
    {
      accepted: true,
      leadId: result.lead.id,
      runId: result.runId,
      status: result.status,
      score: result.decision.score,
    },
    { status: 202 },
  );
}
