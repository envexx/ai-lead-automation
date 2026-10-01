import { Panel, PanelHeader } from "@/components/ui/panel";
import { IntakeForm } from "@/components/intake/intake-form";
import { SeedButton } from "@/components/seed-button";

export const dynamic = "force-dynamic";

const WEBHOOK_BODY = `curl -X POST http://localhost:3000/api/webhooks/lead \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Elena Vossberg",
    "company": "Brueckenwerk",
    "message": "27-person supplier, inbound requests sit for days. Budget around $4,200."
  }'`;

export default function IntakePage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">Input</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Intake console</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">
            Send a lead through the real pipeline. The engine extracts structured fields, scores it
            with the rule engine, chooses an action, drafts a reply, and records every step.
          </p>
        </div>
        <SeedButton />
      </header>

      <Panel className="p-4 md:p-6">
        <IntakeForm />
      </Panel>

      <Panel>
        <PanelHeader title="Pipeline stages" />
        <ol className="grid gap-3 p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {["Normalize", "Understand", "Structured data", "Rule engine", "Act + verify", "Audit log"].map(
            (stage, i) => (
              <li key={stage} className="flex items-center gap-2">
                <span className="tnum text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-ink-2">{stage}</span>
              </li>
            ),
          )}
        </ol>
      </Panel>

      <Panel>
        <PanelHeader title="Webhook endpoint" hint="POST /api/webhooks/lead" />
        <div className="p-4">
          <p className="text-sm text-ink-2">
            Any form, CRM, or automation tool can post JSON here. The response returns the lead id,
            run id, score, and status.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-line-2 bg-surface-2 p-3 font-mono text-[12px] leading-relaxed text-ink">
            {WEBHOOK_BODY}
          </pre>
        </div>
      </Panel>
    </div>
  );
}
