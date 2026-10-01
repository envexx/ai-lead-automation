import Link from "next/link";
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel";
import { LeadTable } from "@/components/leads/lead-table";
import { listLeads } from "@/server/queries";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "HOT", label: "Hot" },
  { key: "WARM", label: "Warm" },
  { key: "COLD", label: "Cold" },
] as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? "ALL").toUpperCase();
  const q = sp.q?.trim() ?? "";

  const leads = await listLeads({
    status: status !== "ALL" && ["HOT", "WARM", "COLD"].includes(status) ? (status as never) : undefined,
    q: q || undefined,
  });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">Pipeline</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Leads</h1>
        </div>
        <form action="/leads" className="flex items-center gap-2">
          <input type="hidden" name="status" value={status === "ALL" ? "" : status} />
          <label htmlFor="q" className="sr-only">
            Search leads
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search name, company, need"
            className="h-9 w-56 rounded-md border border-line-2 bg-surface px-3 text-sm text-ink placeholder:text-ink-3 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
          <button
            type="submit"
            className="h-9 rounded-md border border-line-2 bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            Search
          </button>
        </form>
      </header>

      <div className="flex flex-wrap items-center gap-1">
        {FILTERS.map((filter) => {
          const active = status === filter.key;
          const href =
            filter.key === "ALL"
              ? `/leads${q ? `?q=${encodeURIComponent(q)}` : ""}`
              : `/leads?status=${filter.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
          return (
            <Link
              key={filter.key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium text-ink"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2/70 hover:text-ink"
              }
            >
              {filter.label}
            </Link>
          );
        })}
        <span className="tnum ml-auto text-xs text-ink-3">
          {leads.length} {leads.length === 1 ? "lead" : "leads"}
        </span>
      </div>

      <Panel>
        <PanelHeader title="Qualified leads" hint={q ? `matching "${q}"` : undefined} />
        {leads.length === 0 ? (
          <EmptyState
            title="No leads match this view"
            body="Adjust the filter or send a new lead through the intake console."
            action={
              <Link
                href="/intake"
                className="mt-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong"
              >
                New lead
              </Link>
            }
          />
        ) : (
          <LeadTable leads={leads} />
        )}
      </Panel>
    </div>
  );
}
