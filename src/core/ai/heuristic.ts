import type { Extraction, LeadInput, Understanding, Urgency } from "../types";

// Intent vocabulary the rule engine understands. Keeping it small and explicit
// is what makes the downstream routing predictable.
const INTENT_KEYWORDS: Array<{ intent: string; needles: string[] }> = [
  { intent: "sales_automation", needles: ["sales pipeline", "sales automation", "lead", "crm", "pipeline"] },
  { intent: "support_automation", needles: ["support", "ticket", "helpdesk", "customer service"] },
  { intent: "billing", needles: ["invoice", "billing", "refund", "charged", "payment"] },
  { intent: "partnership", needles: ["partnership", "partner", "integrate", "reseller"] },
  { intent: "recruiting", needles: ["hiring", "recruit", "candidate", "resume", "cv"] },
  { intent: "general_inquiry", needles: [] },
];

function parseBudget(text: string): number | null {
  const lower = text.toLowerCase();
  // "$2,000", "2000 usd", "budget around 2k", "5k budget"
  const kMatch = lower.match(/(?:\$|usd\s*)?\s?(\d+(?:\.\d+)?)\s?k\b/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const moneyMatch = lower.match(/\$\s?([\d,]+(?:\.\d+)?)/);
  if (moneyMatch) return parseInt(moneyMatch[1].replace(/,/g, ""), 10);
  const usdMatch = lower.match(/([\d,]+)\s?(?:usd|dollars)/);
  if (usdMatch) return parseInt(usdMatch[1].replace(/,/g, ""), 10);
  return null;
}

function parseCompanySize(text: string): number | null {
  const m = text.match(/(\d+)\s*[- ]?\s*(?:person|people|employee|staff|pax|headcount)/i);
  if (m) return parseInt(m[1], 10);
  const m2 = text.match(/(?:team of|we're|we are)\s+(\d+)/i);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

function parseUrgency(text: string): Urgency {
  const lower = text.toLowerCase();
  if (/(urgent|asap|immediately|right away|this week|as soon as)/.test(lower)) return "HIGH";
  if (/(soon|next month|q[1-4]|this quarter)/.test(lower)) return "MEDIUM";
  return "LOW";
}

function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  for (const entry of INTENT_KEYWORDS) {
    if (entry.needles.some((n) => lower.includes(n))) return entry.intent;
  }
  return "general_inquiry";
}

function humanizeIntent(intent: string): string {
  return intent.replace(/_/g, " ");
}

function parseName(text: string, provided?: string | null): string | null {
  if (provided && provided.trim()) return provided.trim();
  const m = text.match(/\b(?:i am|i'm|this is|my name is)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  if (m) return m[1];
  return null;
}

function parseCompany(text: string, provided?: string | null): string | null {
  if (provided && provided.trim()) return provided.trim();
  const m = text.match(/(?:at|from)\s+([A-Z][A-Za-z0-9&.\- ]{1,40}?)(?:\s+and|\s+we|,|\.|$)/);
  if (m) return m[1].trim();
  return null;
}

/**
 * Deterministic extractor. This is the guaranteed path: it always returns a
 * usable understanding even with no API key, no network, or a failed model call.
 */
export function heuristicExtraction(input: LeadInput): Extraction {
  const text = input.message ?? "";
  const intent = detectIntent(text);
  const budgetUsd = input.budgetUsd ?? parseBudget(text);
  const companySize = input.companySize ?? parseCompanySize(text);
  const urgency = input.urgency ?? parseUrgency(text);
  const name = parseName(text, input.name);
  const company = parseCompany(text, input.company);

  const signals: string[] = [];
  if (budgetUsd) signals.push(`Budget detected: $${budgetUsd.toLocaleString("en-US")}`);
  if (companySize) signals.push(`Company size: ${companySize} people`);
  if (urgency === "HIGH") signals.push("Urgency language present");
  if (intent !== "general_inquiry") signals.push(`Need mapped to ${humanizeIntent(intent)}`);

  const confidence = Math.min(0.55 + signals.length * 0.1, 0.95);

  return {
    name,
    email: input.email ?? null,
    company,
    companySize,
    need: input.need?.trim() || humanizeIntent(intent),
    budgetUsd,
    urgency,
    intent,
    confidence,
    signals,
    reasoning:
      signals.length > 0
        ? `Extracted ${signals.length} structured signal(s) from the message.`
        : "Message contains no strong qualification signals; treated as general inquiry.",
  };
}

export function heuristicUnderstanding(input: LeadInput): Understanding {
  return {
    extraction: heuristicExtraction(input),
    engine: "heuristic",
    engineLabel: "deterministic scorer",
  };
}
