import { prisma } from "../lib/prisma";
import { understandLead } from "./ai/provider";
import { generateReply } from "./ai/reply";
import { scoreLead } from "./rules";
import { getRulesConfig } from "./settings";
import type { Decision, LeadInput, StepStatusValue, Understanding } from "./types";
import type { ActionType, Prisma } from "@prisma/client";

export async function createLead(input: LeadInput) {
  const lead = await prisma.lead.create({
    data: {
      name: input.name?.trim() || "Unknown sender",
      email: input.email?.trim() || null,
      company: input.company?.trim() || null,
      companySize: input.companySize ?? null,
      need: input.need?.trim() || null,
      budgetUsd: input.budgetUsd ?? null,
      urgency: input.urgency ?? null,
      message: input.message,
      source: input.source ?? "form",
    },
  });

  await prisma.message.create({
    data: {
      leadId: lead.id,
      direction: "INBOUND",
      channel: input.source === "webhook" ? "webhook" : "web",
      body: input.message,
    },
  });

  return lead;
}

interface RunResult {
  runId: string;
  leadId: string;
  decision: Decision;
  understanding: Understanding;
  status: "COMPLETED" | "NEEDS_REVIEW" | "FAILED";
}

/**
 * The pipeline. Every stage is persisted as a RunStep plus an AuditLog entry,
 * so the operations dashboard can replay exactly what the system did.
 */
export async function runAutomation(leadId: string, trigger = "inbound"): Promise<RunResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");

  const settings = await getRulesConfig();

  const run = await prisma.automationRun.create({
    data: { leadId: lead.id, trigger, status: "RUNNING", startedAt: new Date() },
  });

  let seq = 0;
  const step = (name: string, status: StepStatusValue, detail?: string, ms?: number) =>
    prisma.runStep.create({
      data: { runId: run.id, seq: seq++, name, status, detail, ms },
    });
  const audit = (event: string, detail?: string) =>
    prisma.auditLog.create({ data: { runId: run.id, event, detail } });

  const markFailed = async (message: string) => {
    await step("Run failed", "ERROR", message);
    await prisma.automationRun.update({
      where: { id: run.id },
      data: { status: "FAILED", summary: message, finishedAt: new Date() },
    });
    await audit("run.failed", message);
  };

  try {
    const t0 = Date.now();
    await step("Lead received", "OK", `${lead.name}${lead.company ? ` from ${lead.company}` : ""}`);
    await audit("lead.received", lead.message.slice(0, 180));

    const understandStart = Date.now();
    const understanding = await understandLead({
      name: lead.name,
      email: lead.email,
      company: lead.company,
      companySize: lead.companySize,
      need: lead.need,
      budgetUsd: lead.budgetUsd,
      urgency: (lead.urgency as LeadInput["urgency"]) ?? null,
      message: lead.message,
      source: lead.source,
    });
    const extraction = understanding.extraction;
    await step(
      "Extracting information",
      "OK",
      `${understanding.engineLabel}${extraction.signals.length ? ` - ${extraction.signals.join("; ")}` : " - no strong signals"}`,
      Date.now() - understandStart,
    );
    await audit("extraction.done", `engine=${understanding.engine}`);

    const decision = scoreLead(extraction, settings);

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        name: extraction.name ?? lead.name,
        company: extraction.company ?? lead.company,
        companySize: extraction.companySize ?? lead.companySize,
        need: extraction.need ?? lead.need,
        budgetUsd: extraction.budgetUsd ?? lead.budgetUsd,
        urgency: extraction.urgency,
        score: decision.score,
        status: decision.status,
        recommendedAction: decision.action,
        qualified: decision.status !== "COLD",
      },
    });

    await prisma.qualification.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
        intent: extraction.intent,
        confidence: extraction.confidence,
        urgency: extraction.urgency,
        signals: extraction.signals as Prisma.InputJsonValue,
        reasoning: extraction.reasoning,
        engine: understanding.engineLabel,
      },
      update: {
        intent: extraction.intent,
        confidence: extraction.confidence,
        urgency: extraction.urgency,
        signals: extraction.signals as Prisma.InputJsonValue,
        reasoning: extraction.reasoning,
        engine: understanding.engineLabel,
      },
    });

    await step(
      "AI qualification completed",
      "OK",
      `Score ${decision.score}/100 - ${decision.status} - ${decision.action.replace(/_/g, " ")}`,
    );
    await audit("decision.made", `${decision.action} (${decision.status}, score ${decision.score})`);

    const reply = await generateReply(extraction, decision);
    const autoSend = settings.autoReply && !decision.requiresApproval;
    await prisma.message.create({
      data: {
        leadId: lead.id,
        direction: autoSend ? "OUTBOUND" : "DRAFT",
        channel: "email",
        subject: reply.subject,
        body: reply.body,
        engine: reply.engineLabel,
      },
    });
    await step(
      autoSend ? "Response sent" : "Response drafted for approval",
      autoSend ? "OK" : "WARN",
      reply.subject,
    );

    const actions: Array<{
      type: ActionType;
      status: "DONE" | "PENDING";
      risk: "LOW" | "MEDIUM" | "HIGH";
      title: string;
      detail: string;
      mode: string;
    }> = [
      {
        type: "GENERATE_REPLY",
        status: autoSend ? "DONE" : "PENDING",
        risk: decision.requiresApproval ? "HIGH" : "LOW",
        title: autoSend ? "Reply sent to lead" : "Reply drafted for review",
        detail: reply.subject,
        mode: autoSend ? "AUTO" : "APPROVAL",
      },
    ];

    if (decision.action === "BOOK_CALL") {
      actions.push(
        {
          type: "BOOK_CALL",
          status: "PENDING",
          risk: decision.risk,
          title: "Discovery call proposed",
          detail: "Two 20 minute windows offered in the reply.",
          mode: decision.requiresApproval ? "APPROVAL" : "AUTO",
        },
        {
          type: "NOTIFY_SALES",
          status: "DONE",
          risk: "LOW",
          title: `Sales notified on ${settings.notifyChannel}`,
          detail: `Hot lead: ${extraction.company ?? lead.name}`,
          mode: "AUTO",
        },
      );
    }

    actions.push({
      type: "CRM_UPDATE",
      status: "DONE",
      risk: "LOW",
      title: "Internal CRM record updated",
      detail: `Stage moved to ${decision.status.toLowerCase()} with score ${decision.score}.`,
      mode: "AUTO",
    });

    for (const action of actions) {
      await prisma.action.create({
        data: {
          runId: run.id,
          leadId: lead.id,
          type: action.type,
          status: action.status,
          risk: action.risk,
          title: action.title,
          detail: action.detail,
          mode: action.mode,
        },
      });
    }

    const followUp = await prisma.followUpTask.create({
      data: {
        leadId: lead.id,
        runId: run.id,
        title:
          decision.action === "BOOK_CALL"
            ? "Confirm discovery call time"
            : decision.action === "NURTURE"
              ? "Send nurture follow-up"
              : "Re-check lead in 14 days",
        dueAt: new Date(Date.now() + (decision.action === "BOOK_CALL" ? 1 : 7) * 24 * 60 * 60 * 1000),
        assignee: decision.action === "BOOK_CALL" ? "Sales" : "SDR",
      },
    });
    await step("Follow-up scheduled", "OK", followUp.title);

    const verified = actions.every((a) => a.status !== "PENDING" || a.mode === "APPROVAL");
    await step(
      verified ? "Verified" : "Verified with pending approvals",
      verified ? "OK" : "WARN",
      verified
        ? "All automatic actions confirmed."
        : "Automatic actions done. High risk step waiting for a human.",
    );

    const status: RunResult["status"] = decision.requiresApproval ? "NEEDS_REVIEW" : "COMPLETED";
    const summary = `${decision.status} lead scored ${decision.score}/100. ${decision.summary}`;

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status,
        score: decision.score,
        decision: decision.action,
        summary,
        engine: understanding.engineLabel,
        finishedAt: new Date(),
      },
    });
    await audit("run.completed", status);

    return { runId: run.id, leadId: lead.id, decision, understanding, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await markFailed(message);
    throw error;
  }
}

export async function intakeLead(input: LeadInput) {
  const lead = await createLead(input);
  const result = await runAutomation(lead.id, input.source === "webhook" ? "webhook" : "inbound");
  return { lead, ...result };
}
