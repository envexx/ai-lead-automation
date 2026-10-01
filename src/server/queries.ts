import { prisma } from "@/lib/prisma";
import type { LeadStatus, RunStatus } from "@prisma/client";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboard() {
  const since = startOfToday();

  const [leadsToday, qualified, hot, pendingTasks, totalLeads, recentRuns, latestRun] =
    await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: since } } }),
      prisma.lead.count({ where: { qualified: true } }),
      prisma.lead.count({ where: { status: "HOT" } }),
      prisma.followUpTask.count({ where: { status: "OPEN" } }),
      prisma.lead.count(),
      prisma.automationRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 8,
        include: {
          lead: { select: { id: true, name: true, company: true, status: true, score: true } },
          _count: { select: { steps: true } },
        },
      }),
      prisma.automationRun.findFirst({
        orderBy: { startedAt: "desc" },
        include: {
          lead: { select: { id: true, name: true, company: true, need: true, status: true, score: true } },
          steps: { orderBy: { seq: "asc" } },
          actions: true,
        },
      }),
    ]);

  const openTasks = await prisma.followUpTask.findMany({
    where: { status: "OPEN" },
    orderBy: { dueAt: "asc" },
    take: 5,
    include: { lead: { select: { id: true, name: true, company: true } } },
  });

  return {
    stats: { leadsToday, qualified, hot, pendingTasks, totalLeads },
    recentRuns,
    latestRun,
    openTasks,
  };
}

export async function listLeads(params: { status?: LeadStatus; q?: string } = {}) {
  const { status, q } = params;
  return prisma.lead.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
              { need: { contains: q, mode: "insensitive" } },
              { message: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: { _count: { select: { runs: true } } },
  });
}

export async function getLead(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      qualification: true,
      messages: { orderBy: { createdAt: "asc" } },
      tasks: { orderBy: { dueAt: "asc" } },
      actions: { orderBy: { createdAt: "desc" } },
      runs: {
        orderBy: { startedAt: "desc" },
        include: { steps: { orderBy: { seq: "asc" } }, actions: true },
      },
    },
  });
}

export async function listRuns(params: { status?: RunStatus } = {}) {
  return prisma.automationRun.findMany({
    where: params.status ? { status: params.status } : {},
    orderBy: { startedAt: "desc" },
    take: 100,
    include: {
      lead: { select: { id: true, name: true, company: true, status: true } },
      _count: { select: { steps: true, actions: true } },
    },
  });
}

export async function getRun(id: string) {
  return prisma.automationRun.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, name: true, company: true, status: true, score: true } },
      steps: { orderBy: { seq: "asc" } },
      actions: true,
      audit: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getAuditFeed(limit = 40) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { run: { select: { id: true, lead: { select: { id: true, name: true } } } } },
  });
}
