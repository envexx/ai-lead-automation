import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, RunStatusBadge, StatusBadge } from "@/components/ui/badge";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { ScoreMeter } from "@/components/ui/meter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RunTimeline } from "@/components/runs/run-timeline";
import { ActionList } from "@/components/runs/action-list";
import { RunButton } from "@/components/run-button";
import { TaskToggle } from "@/components/task-toggle";
import { getLead } from "@/server/queries";
import { getRulesConfig } from "@/core/settings";
import { formatDateTime, formatUsd } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</dt>
      <dd className="text-right text-sm text-ink">{value}</dd>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, rules] = await Promise.all([getLead(id), getRulesConfig()]);
  if (!lead) notFound();

  const tone = lead.status === "HOT" ? "hot" : lead.status === "WARM" ? "warm" : "cold";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/leads" className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3 hover:text-ink">
            &larr; Leads
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{lead.name}</h1>
            <StatusBadge status={lead.status} />
            {lead.qualified ? <Badge tone="ok">qualified</Badge> : <Badge tone="neutral">unqualified</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-2">
            {lead.company ?? "Unknown company"}
            {lead.companySize ? ` - ${lead.companySize} people` : ""} - source {lead.source}
          </p>
        </div>
        <RunButton leadId={lead.id} label="Re-run automation" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reply">Messages</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="runs">Runs ({lead.runs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Panel>
              <PanelHeader title="AI understanding" hint={lead.qualification?.engine} />
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <dl className="text-sm">
                  <Fact label="Intent" value={lead.qualification?.intent?.replace(/_/g, " ") ?? "-"} />
                  <Fact label="Need" value={lead.need ?? "-"} />
                  <Fact label="Budget" value={formatUsd(lead.budgetUsd) ?? "Not stated"} />
                  <Fact label="Urgency" value={lead.urgency ?? "-"} />
                  <Fact
                    label="Confidence"
                    value={
                      lead.qualification
                        ? `${Math.round(lead.qualification.confidence * 100)}%`
                        : "-"
                    }
                  />
                </dl>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    Extracted signals
                  </p>
                  {Array.isArray(lead.qualification?.signals) &&
                  (lead.qualification?.signals as string[]).length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {(lead.qualification?.signals as string[]).map((signal) => (
                        <li key={signal} className="flex gap-2 text-sm text-ink-2">
                          <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                          {signal}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-ink-2">No strong signals were found.</p>
                  )}
                  {lead.qualification?.reasoning ? (
                    <p className="mt-3 border-l-2 border-line-2 pl-3 text-[13px] italic text-ink-2">
                      {lead.qualification.reasoning}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="border-t border-line px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  Original message
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {lead.message}
                </p>
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="reply" className="mt-4">
            <Panel>
              <PanelHeader title="Conversation" hint={`${lead.messages.length} message(s)`} />
              {lead.messages.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-2">No messages yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {lead.messages.map((message) => (
                    <li key={message.id} className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Badge tone={message.direction === "INBOUND" ? "neutral" : "accent"}>
                          {message.direction}
                        </Badge>
                        <span className="font-mono text-[11px] text-ink-3">
                          {message.channel}
                          {message.engine ? ` - ${message.engine}` : ""}
                        </span>
                        <span className="tnum ml-auto text-[11px] text-ink-3">
                          {formatDateTime(message.createdAt)}
                        </span>
                      </div>
                      {message.subject ? (
                        <p className="mt-2 text-sm font-medium text-ink">{message.subject}</p>
                      ) : null}
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
                        {message.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <Panel>
              <PanelHeader title="Automation actions" hint={`${lead.actions.length} recorded`} />
              <ActionList actions={lead.actions} />
            </Panel>
          </TabsContent>

          <TabsContent value="runs" className="mt-4">
            <div className="flex flex-col gap-4">
              {lead.runs.length === 0 ? (
                <Panel>
                  <p className="px-4 py-6 text-sm text-ink-2">No automation runs yet.</p>
                </Panel>
              ) : (
                lead.runs.map((run) => (
                  <Panel key={run.id} className="overflow-hidden">
                    <PanelHeader
                      title={`Run ${run.trigger}`}
                      hint={run.summary ?? undefined}
                      action={<RunStatusBadge status={run.status} />}
                    />
                    <RunTimeline steps={run.steps} />
                  </Panel>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-6">
          <Panel>
            <PanelHeader title="Score" />
            <div className="p-4">
              <div className="flex items-end justify-between">
                <span className="tnum text-4xl font-semibold leading-none text-hot">
                  {lead.score}
                  <span className="text-lg text-ink-3">/100</span>
                </span>
                <Badge tone="neutral">
                  hot at {rules.hotThreshold} / warm at {rules.warmThreshold}
                </Badge>
              </div>
              <ScoreMeter score={lead.score} tone={tone} className="mt-3" />
              <p className="mt-3 text-[13px] text-ink-2">
                {lead.recommendedAction
                  ? `Recommended action: ${lead.recommendedAction.replace(/_/g, " ")}`
                  : "No recommendation yet."}
              </p>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Record" />
            <dl className="px-4 py-2">
              <Fact label="Received" value={formatDateTime(lead.createdAt)} />
              <Fact label="Email" value={lead.email ?? "-"} />
              <Fact label="Company size" value={lead.companySize ?? "-"} />
              <Fact label="Runs" value={lead.runs.length} />
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title="Follow-up tasks" />
            {lead.tasks.length === 0 ? (
              <p className="px-4 py-5 text-sm text-ink-2">No tasks scheduled.</p>
            ) : (
              <ul className="divide-y divide-line">
                {lead.tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <TaskToggle
                      taskId={task.id}
                      done={task.status === "DONE"}
                      title={task.title}
                    />
                    <span className="tnum shrink-0 text-[11px] text-ink-3">
                      {formatDateTime(task.dueAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
