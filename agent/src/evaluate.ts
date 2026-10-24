/**
 * SafeSend guidance evaluation: 10 scenarios, 5 scams and 5 genuine payments.
 *
 * Runs each scenario through the rule-based guidance and, when an API key is available,
 * through the model too. "Warned" means the guidance named a scam type or gave a
 * confidence of 0.5 or more. A good result warns on every scam and on no genuine payment.
 * The pause itself never depends on this: every scenario here is already paused by the
 * contract.
 *
 * Run: pnpm --filter @thunai/agent evaluate           (writes docs/ai-evaluation.md)
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ClassifierInput } from "@thunai/shared";
import { Classifier, ruleBasedClassification } from "./classifier.js";

type Scenario = { id: number; scam: boolean; title: string; input: ClassifierInput };

const base = { amountVsUsual: 1, payeeIsNew: true, localHour: 14, networkFlagCount: 0 };

const scenarios: Scenario[] = [
  {
    id: 1,
    scam: true,
    title: "Mdm Tan: \"bank officer\" says move savings to a safe account",
    input: { ...base, memo: "Purpose: Someone asked me to. DBS officer said my account is at risk, move to safe account", amountUsd: 3000, amountVsUsual: 20, callDurationMinutes: 45 },
  },
  {
    id: 2,
    scam: true,
    title: "Caller claims to be police, money laundering investigation",
    input: { ...base, memo: "Purpose: Someone asked me to. police officer said I am under investigation, must verify funds", amountUsd: 5000, amountVsUsual: 30 },
  },
  {
    id: 3,
    scam: true,
    title: "\"Grandson\" messaging from a new number, needs money for hospital",
    input: { ...base, memo: "Purpose: Family. grandson new number, accident need hospital deposit", amountUsd: 800, amountVsUsual: 5, localHour: 23 },
  },
  {
    id: 4,
    scam: true,
    title: "Teenager: guaranteed crypto returns from a Telegram group, 2 unverified reports",
    input: { ...base, memo: "Purpose: Investment. signal group mentor guaranteed 30% profit weekly", amountUsd: 400, amountVsUsual: 4, networkFlagCount: 2 },
  },
  {
    id: 5,
    scam: true,
    title: "No keywords, no reports, but \"someone asked me to\"",
    input: { ...base, memo: "Purpose: Someone asked me to. ", amountUsd: 2000, amountVsUsual: 10 },
  },
  {
    id: 6,
    scam: false,
    title: "Birthday gift to a niece, new recipient",
    input: { ...base, memo: "Purpose: Family. birthday ang bao for my niece Jia Hui", amountUsd: 100, amountVsUsual: 0.5 },
  },
  {
    id: 7,
    scam: false,
    title: "Buying a second-hand bicycle from a seller met in person",
    input: { ...base, memo: "Purpose: Shopping. bicycle from Carousell, collected in person at Tampines", amountUsd: 150, amountVsUsual: 1 },
  },
  {
    id: 8,
    scam: false,
    title: "Paying a town council bill",
    input: { ...base, memo: "Purpose: Bills. town council service and conservancy charges", amountUsd: 90, amountVsUsual: 0.5 },
  },
  {
    id: 9,
    scam: false,
    title: "Teenager splitting a concert ticket with a school friend",
    input: { ...base, memo: "Purpose: Other. my half of the concert ticket, Marcus from class", amountUsd: 60, amountVsUsual: 0.6 },
  },
  {
    id: 10,
    scam: false,
    title: "Topping up own account on a well-known exchange",
    input: { ...base, memo: "Purpose: Investment. moving to my own Coinbase account", amountUsd: 500, amountVsUsual: 2 },
  },
];

const warned = (c: { scriptId: number; confidence: number }) => c.scriptId !== 0 || c.confidence >= 0.5;

async function main() {
  const key = process.env.ANTHROPIC_API_KEY;
  const free = process.env.AI_BASE_URL && process.env.AI_MODEL
    ? { baseUrl: process.env.AI_BASE_URL, apiKey: process.env.AI_API_KEY, model: process.env.AI_MODEL }
    : undefined;
  const model = key || free
    ? new Classifier({ apiKey: key, openai: free, model: process.env.CLASSIFIER_MODEL ?? "claude-opus-5-5", effort: "low", timeoutMs: 60_000 })
    : undefined;
  const modelName = free ? free.model : process.env.CLASSIFIER_MODEL ?? "claude-opus-5-5";

  const rows: string[] = [];
  const details: string[] = [];
  const score = { rules: { hit: 0, falseAlarm: 0 }, model: { hit: 0, falseAlarm: 0 } };

  for (const s of scenarios) {
    const rules = ruleBasedClassification(s.input);
    const ai = model ? await model.classify(s.input) : undefined;
    const rw = warned(rules);
    const aw = ai ? warned(ai) : undefined;
    if (s.scam && rw) score.rules.hit++;
    if (!s.scam && rw) score.rules.falseAlarm++;
    if (ai && s.scam && aw) score.model.hit++;
    if (ai && !s.scam && aw) score.model.falseAlarm++;
    const ok = (w: boolean | undefined) => (w === undefined ? "not run" : w === s.scam ? "✅" : "❌");
    rows.push(
      `| ${s.id} | ${s.scam ? "Scam" : "Genuine"} | ${s.title} | ${rw ? "warned" : "calm"} (${rules.confidence.toFixed(2)}) ${ok(rw)} | ${ai ? `${aw ? "warned" : "calm"} (${ai.confidence.toFixed(2)}) ${ok(aw)}` : "not run"} |`,
    );
    details.push(
      `### ${s.id}. ${s.title}\n\n- Note given: \`${s.input.memo}\`\n- Rule-based guidance: ${rules.explanation_en}\n- Suggested question: ${rules.familyQuestionSuggested}` +
        (ai ? `\n- AI guidance (${ai.source}): ${ai.explanation_en}\n- AI question: ${ai.familyQuestionSuggested}` : ""),
    );
  }

  const md = `# SafeSend guidance evaluation

Generated by \`agent/src/evaluate.ts\` on ${new Date().toISOString().slice(0, 10)}.

**What is measured.** Every scenario below is already paused by the contract; the guidance cannot change that. The question is whether the guidance shown to the guardian **warns on scams** (names a scam type, or confidence 0.5 or more) **without alarming on genuine payments**.

| # | Truth | Scenario | Rule-based (fallback) | AI model${model ? ` (${modelName})` : ""} |
|---|---|---|---|---|
${rows.join("\n")}

**Rule-based fallback:** warned on ${score.rules.hit}/5 scams, false alarm on ${score.rules.falseAlarm}/5 genuine payments.
${model ? `**AI model (${modelName}):** warned on ${score.model.hit}/5 scams, false alarm on ${score.model.falseAlarm}/5 genuine payments.` : "**AI model:** not run. Set `AI_BASE_URL` and `AI_MODEL` (a free model such as Groq or a local Ollama) or `ANTHROPIC_API_KEY` in `.env`, then rerun."}

## Limits

- Ten hand-written scenarios is a sanity check, not a study. Real scam messages vary far more.
- Scenario 5 has no keywords and no reports; only the stated purpose gives it away. This is why SafeSend asks "What is this payment for?".
- A guardian still makes the decision. A missed warning here still leaves the payment paused for review.

## Scenario details

${details.join("\n\n")}
`;
  const out = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "ai-evaluation.md");
  writeFileSync(out, md);
  console.log(md.split("## Limits")[0]);
}

await main();
