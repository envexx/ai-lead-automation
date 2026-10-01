import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { ScoreMeter } from "@/components/ui/meter";
import { formatDateTime, formatUsd } from "@/lib/utils";

export interface LeadRow {
  id: string;
  name: string;
  company: string | null;
  need: string | null;
  budgetUsd: number | null;
  status: string;
  score: number;
  createdAt: Date;
  _count: { runs: number };
}

function tone(status: string): "hot" | "warm" | "cold" {
  return status === "HOT" ? "hot" : status === "WARM" ? "warm" : "cold";
}

export function LeadTable({ leads }: { leads: LeadRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            <th className="px-4 py-2 font-medium">Lead</th>
            <th className="px-4 py-2 font-medium">Need</th>
            <th className="px-4 py-2 font-medium">Score</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 text-right font-medium">Budget</th>
            <th className="px-4 py-2 text-right font-medium">Received</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="border-b border-line last:border-b-0 transition-colors hover:bg-surface-2/50"
            >
              <td className="px-4 py-3">
                <Link href={`/leads/${lead.id}`} className="block">
                  <span className="font-medium text-ink hover:text-accent-strong">{lead.name}</span>
                  <span className="block text-[13px] text-ink-2">
                    {lead.company ?? "Unknown company"}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3 text-ink-2">{lead.need ?? "-"}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="tnum w-8 text-right font-medium text-ink">{lead.score}</span>
                  <ScoreMeter score={lead.score} tone={tone(lead.status)} className="w-20" />
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={lead.status} />
              </td>
              <td className="tnum px-4 py-3 text-right text-ink-2">
                {formatUsd(lead.budgetUsd) ?? "-"}
              </td>
              <td className="tnum px-4 py-3 text-right text-ink-3">
                {formatDateTime(lead.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
