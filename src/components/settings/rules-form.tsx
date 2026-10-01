"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

export interface RulesShape {
  hotThreshold: number;
  warmThreshold: number;
  minBudgetUsd: number;
  idealCompanySize: number;
  autoReply: boolean;
  requireApprovalForHot: boolean;
  notifyChannel: string;
}

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export function RulesForm({ initial }: { initial: RulesShape }) {
  const router = useRouter();
  const [form, setForm] = React.useState<RulesShape>(initial);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });

  function set<K extends keyof RulesShape>(key: K, value: RulesShape[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus({ kind: "idle" });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save settings");
      setStatus({ kind: "saved" });
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Save failed" });
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hot threshold" hint="Score at or above this is a hot lead routed to a call.">
          <Input
            type="number"
            min={1}
            max={100}
            value={form.hotThreshold}
            onChange={(e) => set("hotThreshold", Number(e.target.value))}
          />
        </Field>
        <Field label="Warm threshold" hint="Score at or above this is nurtured. Must stay below hot.">
          <Input
            type="number"
            min={0}
            max={99}
            value={form.warmThreshold}
            onChange={(e) => set("warmThreshold", Number(e.target.value))}
          />
        </Field>
        <Field label="Minimum budget (USD)" hint="Budget below this weakens the score.">
          <Input
            type="number"
            min={0}
            value={form.minBudgetUsd}
            onChange={(e) => set("minBudgetUsd", Number(e.target.value))}
          />
        </Field>
        <Field label="Ideal company size" hint="Team size considered a strong fit.">
          <Input
            type="number"
            min={1}
            value={form.idealCompanySize}
            onChange={(e) => set("idealCompanySize", Number(e.target.value))}
          />
        </Field>
        <Field label="Notify channel" hint="Where hot leads raise the internal alert.">
          <Input
            value={form.notifyChannel}
            onChange={(e) => set("notifyChannel", e.target.value)}
            placeholder="#sales"
          />
        </Field>
      </div>

      <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
        <label className="flex items-center justify-between gap-4 px-4 py-3">
          <span>
            <span className="text-sm font-medium text-ink">Auto-send replies</span>
            <span className="mt-0.5 block text-[13px] text-ink-2">
              Send the generated response immediately. When off, it stays a draft.
            </span>
          </span>
          <Switch
            checked={form.autoReply}
            onCheckedChange={(v) => set("autoReply", v)}
            aria-label="Auto-send replies"
          />
        </label>
        <label className="flex items-center justify-between gap-4 px-4 py-3">
          <span>
            <span className="text-sm font-medium text-ink">Require approval for hot leads</span>
            <span className="mt-0.5 block text-[13px] text-ink-2">
              Hold the run in review until a human approves the next step.
            </span>
          </span>
          <Switch
            checked={form.requireApprovalForHot}
            onCheckedChange={(v) => set("requireApprovalForHot", v)}
            aria-label="Require approval for hot leads"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status.kind === "saving"}>
          {status.kind === "saving" ? "Saving..." : "Save rules"}
        </Button>
        {status.kind === "saved" ? (
          <span className="text-sm text-ok">Rules saved. New runs use them immediately.</span>
        ) : null}
        {status.kind === "error" ? (
          <span className="text-sm text-danger">{status.message}</span>
        ) : null}
      </div>
    </form>
  );
}
