import Link from "next/link";
import { Badge, RunStatusBadge, StatusBadge } from "@/components/ui/badge";
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel";
import { StatStrip } from "@/components/dashboard/stat-strip";
import { RunTimeline } from "@/components/runs/run-timeline";
import { getDashboard } from "@/server/queries";
import { aiConfigured } from "@/core/ai/provider";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { stats, recentRuns, latestRun, openTasks } = await getDashboard();
  const engine = aiConfigured() ? "OpenAI live" : "deterministic scorer";

  const hasData = stats.totalLeads > 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            Lead operations
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Qualification and follow-up
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent">engine: {engine}</Badge>
          <span className="tnum text-xs text-ink-3">{formatDateTime(new Date())}</span>
        </div>
      </header>

      <StatStrip
        items={[
          { label: "Leads today", value: stats.leadsToday },
          { label: "Qualified", value: stats.qualified, tone: "accent" },
          { label: "Hot leads", value: stats.hot, tone: "hot" },
          { label: "Follow-ups pending", value: stats.pendingTasks },
        ]}
      />

      {!hasData ? (
        <EmptyState
          title="No leads have arrived yet"
          body="Send a lead through the intake console or the webhook endpoint to watch the pipeline extract, score, decide, and log every step."
          action={
            <Link
              href="/intake"
              className="mt-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong"
            >
              Open intake console
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <Panel className="overflow-hidden">
            <PanelHeader
              title="Live automation"
              hint={latestRun ? `triggered by ${latestRun.trigger}` : undefined}
              action={latestRun ? <RunStatusBadge status={latestRun.status} /> : null}
            />
            {latestRun && latestRun.lead ? (
              <div className="flex flex-col">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/leads/${latestRun.lead.id}`}
                        className="text-lg font-semibold text-ink hover:text-accent-strong"
                      >
                        {latestRun.lead.name}
                      </Link>
                      <StatusBadge status={latestRun.lead.status} />
                    </div>
                    <p className="mt-0.5 text-sm text-ink-2">
                      {latestRun.lead.company ?? "Unknown company"}
                      {latestRun.lead.need ? ` - ${latestRun.lead.need}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      score
                    </p>
                    <p className="tnum text-3xl font-semibold leading-none text-hot">
                      {latestRun.score ?? latestRun.lead.score}
                      <span className="text-base text-ink-3">/100</span>
                    </p>
                  </div>
                </div>

                <div className="border-b border-line bg-surface-2/40 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    AI decision
                  </p>
                  <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
                    <li>{latestRun.decision?.replace(/_/g, " ") ?? "pending"}</li>
                    <li aria-hidden="true" className="text-ink-3">
                      /
                    </li>
                    <li>priority {latestRun.lead.status === "HOT" ? "HIGH" : "NORMAL"}</li>
                    <li aria-hidden="true" className="text-ink-3">
                      /
                    </li>
                    <li>{latestRun.engine ?? "engine"}</li>
                  </ol>
                </div>

                <div className="max-h-[320px] overflow-y-auto">
                  <RunTimeline steps={latestRun.steps} />
                </div>
              </div>
            ) : (
              <EmptyState
                title="No run in flight"
                body="The next inbound lead will appear here as the engine processes it."
              />
            )}
          </Panel>

          <div className="flex flex-col gap-6">
            <Panel>
              <PanelHeader
                title="Follow-ups due"
                action={
                  <Link href="/leads" className="text-[13px] text-accent-strong hover:underline">
                    View leads
                  </Link>
                }
              />
              {openTasks.length === 0 ? (
                <p className="px-4 py-5 text-sm text-ink-2">No open follow-ups.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {openTasks.map((task) => (
                    <li key={task.id} className="px-4 py-3">
                      <p className="text-sm font-medium text-ink">{task.title}</p>
                      <p className="mt-0.5 text-[13px] text-ink-2">
                        <Link
                          href={`/leads/${task.lead.id}`}
                          className="hover:text-accent-strong"
                        >
                          {task.lead.name}
                        </Link>
                        {task.lead.company ? ` - ${task.lead.company}` : ""}
                      </p>
                      <p className="tnum mt-1 text-[11px] text-ink-3">
                        due {formatDateTime(task.dueAt)} - {task.assignee}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Recent runs"
                action={
                  <Link href="/runs" className="text-[13px] text-accent-strong hover:underline">
                    All runs
                  </Link>
                }
              />
              <ul className="divide-y divide-line">
                {recentRuns.map((run) => (
                  <li key={run.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">
                        {run.lead?.name ?? "Unlinked lead"}
                      </p>
                      <p className="tnum text-[11px] text-ink-3">
                        {formatDateTime(run.startedAt)} - {run._count.steps} steps
                      </p>
                    </div>
                    <RunStatusBadge status={run.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
