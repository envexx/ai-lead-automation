// Shared types for the Firstpass automation core.
// The pipeline is: input -> normalize -> understand -> structured data ->
// rules -> decision -> action -> verify -> audit.

export type Urgency = "LOW" | "MEDIUM" | "HIGH";
export type LeadStatusValue = "HOT" | "WARM" | "COLD";
export type ActionTypeValue =
  | "GENERATE_REPLY"
  | "CREATE_TASK"
  | "NOTIFY_SALES"
  | "CRM_UPDATE"
  | "BOOK_CALL"
  | "NURTURE"
  | "LOW_PRIORITY";

export type EngineMode = "openai" | "heuristic" | "heuristic-fallback";

export interface LeadInput {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  companySize?: number | null;
  need?: string | null;
  budgetUsd?: number | null;
  urgency?: Urgency | null;
  message: string;
  source?: string;
}

export interface Extraction {
  name: string | null;
  email: string | null;
  company: string | null;
  companySize: number | null;
  need: string | null;
  budgetUsd: number | null;
  urgency: Urgency;
  intent: string;
  confidence: number;
  signals: string[];
  reasoning: string;
}

export interface Understanding {
  extraction: Extraction;
  engine: EngineMode;
  engineLabel: string;
}

export interface Decision {
  score: number;
  status: LeadStatusValue;
  action: ActionTypeValue;
  priority: Urgency;
  risk: "LOW" | "MEDIUM" | "HIGH";
  requiresApproval: boolean;
  summary: string;
}

export type StepStatusValue = "OK" | "WARN" | "ERROR";

export interface RunStepRecord {
  seq: number;
  name: string;
  status: StepStatusValue;
  detail?: string;
  ms?: number;
}
