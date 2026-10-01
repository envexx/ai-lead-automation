import OpenAI from "openai";
import type { Decision, Extraction } from "../types";
import { aiConfigured } from "./provider";

export interface GeneratedReply {
  subject: string;
  body: string;
  engineLabel: string;
}

function templateReply(extraction: Extraction, decision: Decision): GeneratedReply {
  const firstName = (extraction.name ?? "there").split(" ")[0];
  const company = extraction.company ? ` at ${extraction.company}` : "";
  const need = extraction.need ?? "the workflow you described";

  if (decision.action === "BOOK_CALL") {
    return {
      subject: `Re: ${need}`,
      body: `Hi ${firstName},

Thanks for reaching out${company}. Based on what you shared, this looks like a strong fit for an automated ${need} pipeline.

I have two 20 minute slots open this week. If you reply with a time window that works, I will send an invite and a short agenda.

Quick context so the call is useful: I will walk through how the pipeline scores and routes incoming leads, and what the follow-up automation looks like in practice.

Best,
Firstpass Sales`,
      engineLabel: "template",
    };
  }

  if (decision.action === "NURTURE") {
    return {
      subject: `Re: ${need}`,
      body: `Hi ${firstName},

Thanks for the note${company}. What you described maps to a setup we run often, though the timing and scope are not urgent yet.

I put together a short overview of how the qualification and follow-up flow works. If it looks relevant, reply and I will share a walkthrough.

Best,
Firstpass Sales`,
      engineLabel: "template",
    };
  }

  return {
    subject: `Re: ${need}`,
    body: `Hi ${firstName},

Thanks for getting in touch${company}. I have logged your note so it is not lost.

If this becomes a priority later, reply here and I will pick it back up with the right context.

Best,
Firstpass Sales`,
    engineLabel: "template",
  };
}

/**
 * Draft a personalized response. OpenAI when configured, template otherwise.
 * The template path is deliberately specific, not filler.
 */
export async function generateReply(extraction: Extraction, decision: Decision): Promise<GeneratedReply> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return templateReply(extraction, decision);

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  try {
    const client = new OpenAI({ apiKey, timeout: 20000, maxRetries: 1 });
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You write short B2B replies for a sales team. Under 120 words. Plain text only, no markdown, no em dashes. If the lead is hot, propose two concrete meeting windows and a short agenda. Sign off as 'Firstpass Sales'.",
        },
        {
          role: "user",
          content: JSON.stringify({
            lead: extraction,
            decision: { action: decision.action, status: decision.status, score: decision.score },
          }),
        },
      ],
    });
    const body = completion.choices[0]?.message?.content?.trim();
    if (!body) return templateReply(extraction, decision);
    const subject = `Re: ${extraction.need ?? "your inquiry"}`;
    return { subject, body, engineLabel: model };
  } catch {
    return templateReply(extraction, decision);
  }
}

export { aiConfigured };
