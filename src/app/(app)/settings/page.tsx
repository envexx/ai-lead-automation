import { Panel, PanelHeader } from "@/components/ui/panel";
import { RulesForm } from "@/components/settings/rules-form";
import { getRulesConfig } from "@/core/settings";
import { getRulesLine } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const rules = await getRulesConfig();

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">Configuration</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Qualification rules</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">{getRulesLine()}</p>
      </header>

      <Panel className="p-4 md:p-6">
        <RulesForm
          initial={{
            hotThreshold: rules.hotThreshold,
            warmThreshold: rules.warmThreshold,
            minBudgetUsd: rules.minBudgetUsd,
            idealCompanySize: rules.idealCompanySize,
            autoReply: rules.autoReply,
            requireApprovalForHot: rules.requireApprovalForHot,
            notifyChannel: rules.notifyChannel,
          }}
        />
      </Panel>

      <Panel>
        <PanelHeader title="How the decision is made" />
        <div className="grid gap-4 p-4 text-sm text-ink-2 sm:grid-cols-3">
          <div>
            <p className="font-medium text-ink">1. Understand</p>
            <p className="mt-1">
              The model or the deterministic extractor reads the message into structured fields.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">2. Score and route</p>
            <p className="mt-1">
              Weighted rules turn those fields into a score and one of three actions. The model
              never sets the score.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">3. Act and log</p>
            <p className="mt-1">
              The engine drafts a reply, updates the CRM, schedules a follow-up, and records every
              step.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
