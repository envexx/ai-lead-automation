// Central copy. Kept in one place so tone stays consistent and free of
// em dashes, which this project bans in shipped text.

export function getRulesLine() {
  return "These rules decide what the system does on its own and what it holds for a human. The model extracts and drafts. The score and the routing stay in code.";
}

export const INTAKE_SAMPLE = {
  name: "Elena Vossberg",
  email: "elena@brueckenwerk.de",
  company: "Brueckenwerk",
  companySize: 27,
  budgetUsd: 4200,
  urgency: "HIGH",
  message:
    "We are a 27-person industrial supplier. Inbound requests sit in a shared inbox for days. We want them read, scored, and answered with a follow-up scheduled. Budget around $4,200 and we would like this running this month.",
};
