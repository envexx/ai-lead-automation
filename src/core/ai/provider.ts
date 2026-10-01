import OpenAI from "openai";
import { z } from "zod";
import type { LeadInput, Understanding } from "../types";
import { heuristicUnderstanding } from "./heuristic";

const ModelExtraction = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  companySize: z.number().int().nullable().optional(),
  need: z.string().nullable().optional(),
  budgetUsd: z.number().int().nullable().optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  intent: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  signals: z.array(z.string()).optional(),
  reasoning: z.string().optional(),
});

const SYSTEM_PROMPT = `You extract structured lead data for a B2B sales qualification pipeline.
Return ONLY a JSON object with these keys:
name (string|null), email (string|null), company (string|null), companySize (integer|null),
need (short phrase), budgetUsd (integer|null, expand "2k" to 2000), urgency ("LOW"|"MEDIUM"|"HIGH"),
intent (one of: sales_automation, support_automation, billing, partnership, recruiting, general_inquiry),
confidence (0..1), signals (array of short strings), reasoning (one sentence).
Rules: never invent data that is not implied by the message. Use null when unknown. No em dashes.`;

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function resolvedModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

/**
 * Understand a raw lead. Uses OpenAI when a key is present, and always falls
 * back to the deterministic extractor so the pipeline never stalls.
 */
export async function understandLead(input: LeadInput): Promise<Understanding> {
  const fallback = heuristicUnderstanding(input);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return fallback;

  const model = resolvedModel();
  try {
    const client = new OpenAI({ apiKey, timeout: 20000, maxRetries: 1 });
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            message: input.message,
            known: {
              name: input.name ?? null,
              email: input.email ?? null,
              company: input.company ?? null,
              companySize: input.companySize ?? null,
              budgetUsd: input.budgetUsd ?? null,
              urgency: input.urgency ?? null,
            },
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = ModelExtraction.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return {
        ...fallback,
        engine: "heuristic-fallback",
        engineLabel: "deterministic scorer (model output rejected)",
      };
    }

    const d = parsed.data;
    return {
      extraction: {
        name: d.name ?? fallback.extraction.name,
        email: d.email ?? fallback.extraction.email,
        company: d.company ?? fallback.extraction.company,
        companySize: d.companySize ?? fallback.extraction.companySize,
        need: d.need ?? fallback.extraction.need,
        budgetUsd: d.budgetUsd ?? fallback.extraction.budgetUsd,
        urgency: d.urgency ?? fallback.extraction.urgency,
        intent: d.intent ?? fallback.extraction.intent,
        confidence: d.confidence ?? fallback.extraction.confidence,
        signals: d.signals && d.signals.length > 0 ? d.signals : fallback.extraction.signals,
        reasoning: d.reasoning ?? fallback.extraction.reasoning,
      },
      engine: "openai",
      engineLabel: model,
    };
  } catch {
    return {
      ...fallback,
      engine: "heuristic-fallback",
      engineLabel: "deterministic scorer (model unavailable)",
    };
  }
}
