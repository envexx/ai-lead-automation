import { prisma } from "../lib/prisma";
import { createLead, runAutomation } from "./engine";
import { setRulesConfig } from "./settings";
import type { LeadInput } from "./types";

// Demonstration leads. Written to look like real inbound messages, not filler.
const DEMO_LEADS: LeadInput[] = [
  {
    name: "Mara Lindqvist",
    email: "mara@northboundfreight.se",
    company: "Northbound Freight",
    companySize: 34,
    need: "Sales pipeline automation",
    budgetUsd: 2400,
    urgency: "MEDIUM",
    message:
      "Hi, we're a 34-person freight brokerage and our sales pipeline is tracked in spreadsheets. We want leads qualified automatically and follow-ups sent without someone remembering. Budget around $2,400 to start.",
  },
  {
    name: "Tobias Reiner",
    email: "t.reiner@kesslersohn.de",
    company: "Kessler & Sohn",
    companySize: 12,
    need: "CRM cleanup",
    budgetUsd: 1100,
    urgency: "LOW",
    message:
      "We have a messy CRM and no process for scoring inbound. Curious whether this could help. Budget is tight, maybe $1,100.",
  },
  {
    name: "Priya Raghunathan",
    email: "priya@loomandledger.in",
    company: "Loom & Ledger",
    companySize: 8,
    need: "Invoice intake automation",
    budgetUsd: 3600,
    urgency: "HIGH",
    message:
      "We need invoice emails read, extracted, and routed for approval. This is urgent, we are drowning. Budget $3,600 and we can start this week.",
  },
  {
    name: "Dele Okafor",
    email: "dele@harborlightdental.com",
    company: "Harborlight Dental",
    companySize: 22,
    need: "Appointment reminders",
    budgetUsd: 900,
    urgency: "MEDIUM",
    message:
      "A 22-person clinic. Missed appointments are costing us. Looking for automated reminders and rescheduling. Budget near $900.",
  },
  {
    name: "Sofia Marchetti",
    email: "sofia@casaverdeimports.it",
    company: "Casa Verde Imports",
    companySize: 6,
    need: "Supplier email triage",
    budgetUsd: 1800,
    urgency: "LOW",
    message:
      "Small import business, 6 people. Supplier emails pile up and nobody triages them. Would $1,800 get us something working?",
  },
  {
    name: "Jonas Baumann",
    email: "jonas@alpstein-analytics.ch",
    company: "Alpstein Analytics",
    companySize: 45,
    need: "Lead routing",
    budgetUsd: 6500,
    urgency: "HIGH",
    message:
      "We generate 300+ inbound leads a month across 45 people and routing is manual. We want scoring, routing, and reply drafting. Budget $6,500, need this live ASAP.",
  },
  {
    name: "Yuki Tanabe",
    email: "yuki@kiteandpine.jp",
    company: "Kite & Pine Studio",
    companySize: 4,
    need: "Proposal drafting",
    urgency: "LOW",
    message:
      "We're a 4-person design studio. Proposals take forever. Not sure on budget yet, just exploring what is possible.",
  },
  {
    name: "Grace Whitfield",
    email: "grace@whitfieldlegal.co.uk",
    company: "Whitfield Legal",
    companySize: 18,
    need: "Client intake automation",
    budgetUsd: 2000,
    urgency: "HIGH",
    message:
      "Law firm of 18. New client intake forms come in and sit for days. We want them qualified and routed the same day. Budget $2,000, this week if possible.",
  },
  {
    name: "Ravi Chandrasekhar",
    email: "ravi@meridianlogistics.com",
    company: "Meridian Logistics",
    companySize: 60,
    need: "Quote follow-up",
    budgetUsd: 9000,
    urgency: "MEDIUM",
    message:
      "60-person logistics firm. We send quotes and never follow up. Want an automated follow-up sequence tied to deal stage. Budget up to $9,000.",
  },
  {
    name: "Nadia Haddad",
    email: "nadia@seleneskincare.ae",
    company: "Selene Skincare",
    companySize: 15,
    need: "Support triage",
    budgetUsd: 1250,
    urgency: "MEDIUM",
    message:
      "DTC skincare brand, 15 people. Support inbox is split between four people and things fall through. Looking for triage and drafting. Around $1,250.",
  },
];

export async function seedDemoData({ reset = true }: { reset?: boolean } = {}) {
  if (reset) {
    await prisma.auditLog.deleteMany();
    await prisma.action.deleteMany();
    await prisma.followUpTask.deleteMany();
    await prisma.message.deleteMany();
    await prisma.runStep.deleteMany();
    await prisma.automationRun.deleteMany();
    await prisma.qualification.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.setting.deleteMany();
  }

  await setRulesConfig({});

  const results: Array<{ lead: string; status: string; score: number }> = [];

  for (const input of DEMO_LEADS) {
    const lead = await createLead({ ...input, source: "seed" });
    // Spread receipts across the day so the dashboard looks like a live queue.
    const offset = results.length * 7 * 60 * 1000;
    await prisma.lead.update({
      where: { id: lead.id },
      data: { createdAt: new Date(Date.now() - offset) },
    });
    const run = await runAutomation(lead.id, "seed");
    await prisma.automationRun.update({
      where: { id: run.runId },
      data: { startedAt: new Date(Date.now() - offset) },
    });
    results.push({
      lead: lead.name ?? "Unknown",
      status: run.decision.status,
      score: run.decision.score,
    });
  }

  return { seeded: results.length, results };
}
