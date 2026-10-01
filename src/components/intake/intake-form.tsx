"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/field";
import { INTAKE_SAMPLE } from "@/lib/copy";

interface Result {
  leadId: string;
  runId: string;
  status: string;
  leadStatus: string;
  score: number;
  decision: string;
  engine: string;
}

const EMPTY = {
  name: "",
  email: "",
  company: "",
  companySize: "",
  budgetUsd: "",
  urgency: "MEDIUM",
  message: "",
};

export function IntakeForm() {
  const router = useRouter();
  const [form, setForm] = React.useState({ ...EMPTY });
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);

  function set(key: keyof typeof EMPTY, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function fillSample() {
    setForm({
      name: INTAKE_SAMPLE.name,
      email: INTAKE_SAMPLE.email,
      company: INTAKE_SAMPLE.company,
      companySize: String(INTAKE_SAMPLE.companySize),
      budgetUsd: String(INTAKE_SAMPLE.budgetUsd),
      urgency: INTAKE_SAMPLE.urgency,
      message: INTAKE_SAMPLE.message,
    });
    setResult(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.message.trim()) {
      setError("A message is required so the engine has something to read.");
      return;
    }
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || null,
          email: form.email || null,
          company: form.company || null,
          companySize: form.companySize ? Number(form.companySize) : null,
          budgetUsd: form.budgetUsd ? Number(form.budgetUsd) : null,
          urgency: form.urgency,
          message: form.message,
          source: "form",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.issues ? JSON.stringify(data.issues) : data.error;
        throw new Error(detail ?? "The pipeline rejected this lead.");
      }
      setResult({
        leadId: data.leadId,
        runId: data.runId,
        status: data.status,
        leadStatus: data.decision.status,
        score: data.decision.score,
        decision: data.decision.action,
        engine: data.engine,
      });
      setForm({ ...EMPTY });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field label="Company">
            <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Company size">
            <Input
              type="number"
              min={1}
              value={form.companySize}
              onChange={(e) => set("companySize", e.target.value)}
              placeholder="People"
            />
          </Field>
          <Field label="Budget (USD)">
            <Input
              type="number"
              min={0}
              value={form.budgetUsd}
              onChange={(e) => set("budgetUsd", e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field label="Urgency">
            <select
              value={form.urgency}
              onChange={(e) => set("urgency", e.target.value)}
              className="h-9 w-full rounded-md border border-line-2 bg-surface px-3 text-sm text-ink focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </Field>
        </div>

        <Field label="Message" hint="Paste the raw inbound message. The engine extracts from the text.">
          <Textarea
            rows={6}
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="Hi, we're a 20-person agency and looking for an AI automation solution for our sales pipeline. Budget around $2,000."
          />
        </Field>

        {error ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Running pipeline..." : "Send through pipeline"}
          </Button>
          <Button type="button" variant="outline" onClick={fillSample} disabled={pending}>
            Fill sample lead
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-line bg-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          Pipeline result
        </p>
        {result ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={result.leadStatus} />
              <Badge tone="neutral">run {result.status.replace(/_/g, " ")}</Badge>
            </div>
            <p className="tnum text-4xl font-semibold leading-none text-hot">
              {result.score}
              <span className="text-lg text-ink-3">/100</span>
            </p>
            <p className="text-sm text-ink">
              Decision: <span className="font-medium">{result.decision.replace(/_/g, " ")}</span>
            </p>
            <p className="text-[13px] text-ink-3">engine {result.engine}</p>
            <div className="mt-1 flex flex-wrap gap-3 text-sm">
              <Link href={`/leads/${result.leadId}`} className="text-brand-strong hover:underline">
                Open lead
              </Link>
              <Link href={`/runs/${result.runId}`} className="text-brand-strong hover:underline">
                Open run
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-2">
            Send a lead and the extracted score, status, and chosen action appear here. The full run
            is saved to the audit log.
          </p>
        )}
      </div>
    </div>
  );
}
