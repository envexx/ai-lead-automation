import type { Decision, Extraction, Urgency } from "./types";
import type { RulesConfig } from "./settings";
import { URGENCY_ORDER } from "./settings";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function budgetRatio(budgetUsd: number | null, minBudgetUsd: number): number {
  if (!budgetUsd || budgetUsd <= 0) return 0.15;
  const ceiling = Math.max(minBudgetUsd * 8, 8000);
  return clamp01(budgetUsd / ceiling);
}

function sizeRatio(companySize: number | null, idealSize: number): number {
  if (!companySize || companySize <= 0) return 0.2;
  if (companySize >= idealSize) return clamp01(0.6 + companySize / (idealSize * 12));
  return clamp01(companySize / idealSize * 0.6);
}

function urgencyRatio(urgency: Urgency): number {
  if (urgency === "HIGH") return 1;
  if (urgency === "MEDIUM") return 0.6;
  return 0.2;
}

function intentRatio(intent: string): number {
  return intent === "general_inquiry" ? 0.3 : 1;
}

/**
 * Deterministic rule engine. The model supplies structured understanding; the
 * score and the routing decision stay in code so they are auditable.
 */
export function scoreLead(extraction: Extraction, settings: RulesConfig): Decision {
  const w = settings.weights;
  const weighted =
    budgetRatio(extraction.budgetUsd, settings.minBudgetUsd) * w.budget +
    sizeRatio(extraction.companySize, settings.idealCompanySize) * w.size +
    urgencyRatio(extraction.urgency) * w.urgency +
    intentRatio(extraction.intent) * w.intent +
    clamp01(extraction.confidence) * w.confidence;

  const score = Math.max(0, Math.min(100, Math.round(weighted)));

  let status: Decision["status"];
  let action: Decision["action"];
  if (score >= settings.hotThreshold) {
    status = "HOT";
    action = "BOOK_CALL";
  } else if (score >= settings.warmThreshold) {
    status = "WARM";
    action = "NURTURE";
  } else {
    status = "COLD";
    action = "LOW_PRIORITY";
  }

  const priority: Urgency =
    URGENCY_ORDER[extraction.urgency] >= 2 ? "HIGH" : extraction.urgency;

  const highValue = (extraction.budgetUsd ?? 0) >= settings.minBudgetUsd * 6;
  const requiresApproval =
    (settings.requireApprovalForHot && status === "HOT") || (status === "HOT" && highValue);

  const risk: Decision["risk"] = requiresApproval
    ? "HIGH"
    : status === "HOT"
      ? "MEDIUM"
      : "LOW";

  const summary =
    status === "HOT"
      ? `Hot lead. Route to ${action.replace(/_/g, " ")} with priority ${priority}.`
      : status === "WARM"
        ? `Warm lead. ${action.replace(/_/g, " ")} and re-check next week.`
        : `Low signal. Log for ${action.replace(/_/g, " ")}.`;

  return { score, status, action, priority, risk, requiresApproval, summary };
}
