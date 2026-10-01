import { NextResponse } from "next/server";
import { z } from "zod";
import { intakeLead } from "@/core/engine";
import { listLeads } from "@/server/queries";

export const dynamic = "force-dynamic";

const LeadSchema = z.object({
  name: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().max(200).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  companySize: z.coerce.number().int().positive().max(100000).optional().nullable(),
  need: z.string().trim().max(200).optional().nullable(),
  budgetUsd: z.coerce.number().int().nonnegative().max(100000000).optional().nullable(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().nullable(),
  message: z.string().trim().min(1, "A message is required").max(4000),
  source: z.string().trim().max(40).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q") ?? undefined;
  const leads = await listLeads({
    status: status && ["HOT", "WARM", "COLD"].includes(status) ? (status as never) : undefined,
    q: q || undefined,
  });
  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid lead payload", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  try {
    const result = await intakeLead(parsed.data);
    return NextResponse.json(
      {
        leadId: result.lead.id,
        runId: result.runId,
        status: result.status,
        decision: result.decision,
        engine: result.understanding.engineLabel,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
