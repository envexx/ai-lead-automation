import { prisma } from "../lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Urgency } from "./types";

export interface RulesConfig {
  hotThreshold: number;
  warmThreshold: number;
  minBudgetUsd: number;
  idealCompanySize: number;
  autoReply: boolean;
  requireApprovalForHot: boolean;
  notifyChannel: string;
  weights: {
    budget: number;
    size: number;
    urgency: number;
    intent: number;
    confidence: number;
  };
}

export const DEFAULT_RULES: RulesConfig = {
  hotThreshold: 80,
  warmThreshold: 50,
  minBudgetUsd: 500,
  idealCompanySize: 10,
  autoReply: true,
  requireApprovalForHot: false,
  notifyChannel: "#sales",
  weights: {
    budget: 30,
    size: 15,
    urgency: 20,
    intent: 20,
    confidence: 15,
  },
};

const SETTINGS_KEY = "rules";

export async function getRulesConfig(): Promise<RulesConfig> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row) return DEFAULT_RULES;
    return { ...DEFAULT_RULES, ...(row.value as Partial<RulesConfig>) } as RulesConfig;
  } catch {
    return DEFAULT_RULES;
  }
}

export async function setRulesConfig(patch: Partial<RulesConfig>): Promise<RulesConfig> {
  const current = await getRulesConfig();
  const next: RulesConfig = {
    ...current,
    ...patch,
    weights: { ...current.weights, ...(patch.weights ?? {}) },
  };
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: next as unknown as Prisma.InputJsonValue },
    update: { value: next as unknown as Prisma.InputJsonValue },
  });
  return next;
}

export const URGENCY_ORDER: Record<Urgency, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};
