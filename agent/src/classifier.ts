import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SCAM_SCRIPT, type ClassifierInput, type Classification } from "@thunai/shared";

/**
 * SafeSend's guidance for the guardian.
 *
 * HARD RULE, and the most important line in this service: the AI never moves or releases
 * money, and never changes whether a payment is paused. By the time this runs, the contract
 * has already paused the payment on fixed rules and only the guardian's Face ID can release
 * it. This only explains the evidence and suggests what to ask.
 *
 * It must fail soft: with no API key, a timeout, or an unusable answer, the guardian gets
 * the rule-based guidance below instead. The app labels which one it is.
 *
 * Script ids keep their original numbers so reports already onchain still line up. Their
 * meaning, for Singapore:
 *   1 government official impersonation (police, MAS, ICA, MOM, IRAS, CPF)
 *   2 bank officer / "safe account" scam
 *   3 fake friend or family member (new number, emergency)
 *   4 job or task scam
 *   5 investment scam
 */

const ClassificationSchema = z.object({
  scriptId: z
    .number()
    .int()
    .min(0)
    .max(5)
    .describe(
      "0 none clear, 1 government official impersonation, 2 bank officer / safe account, 3 fake friend or family, 4 job or task scam, 5 investment scam",
    ),
  confidence: z.number().min(0).max(1).describe("How certain the label is, 0 to 1"),
  explanation_en: z
    .string()
    .describe(
      "Two or three short sentences for the guardian: what the evidence shows, and what is uncertain. Plain English, no jargon.",
    ),
  familyQuestionSuggested: z
    .string()
    .describe("The single most useful question the guardian should ask the protected user, given their stated purpose."),
});

const SYSTEM_PROMPT = `You help a guardian in Singapore review a crypto payment that a family member (often an older adult or a teenager new to crypto) is trying to make.

The payment is ALREADY paused by fixed contract rules. You are not deciding anything and you cannot move money. Your job is to explain the evidence and suggest what to ask, in words a busy family member understands in seconds.

Scam types you can label:
1 GOVERNMENT IMPERSONATION - caller claims to be police, MAS, ICA, MOM, IRAS or CPF, says the victim is under investigation, demands money be moved or "verified".
2 BANK OFFICER / SAFE ACCOUNT - caller claims to be from a bank and says the money must be moved to a "safe account" to protect it.
3 FAKE FRIEND OR FAMILY - a message from a "new number" claiming to be a relative or friend in an emergency.
4 JOB OR TASK - a part-time job or "task" scheme that asks the victim to pay first or forward money.
5 INVESTMENT - guaranteed or unusually high returns, often from a group chat, social media or a dating contact.
0 NONE CLEAR - nothing matches, or there is not enough to go on.

You are given what the user chose as the purpose ("Family", "Shopping", "Bills", "Investment", "Someone asked me to", "Other") and their own note. "Someone asked me to" is the strongest single warning sign: real banks, police and government officers never ask anyone to move money to keep it safe.

Rules for your writing:
- Address the guardian.
- Two or three short sentences. No technical words, no crypto words.
- Say what the evidence shows AND what is uncertain. Reports can be wrong; no reports does not mean safe.
- Never state as fact that it IS a scam. Say what it looks like.
- If the signals are weak, say so and use a low confidence. A false alarm on a real family payment costs trust.
- The question must fit the stated purpose and be something the guardian can check independently (who asked, how they got in touch, whether they were told to keep it secret, how the recipient was verified).`;

export type ClassifierOptions = {
  apiKey?: string;
  model: string;
  /** Lower effort keeps a one-shot label fast; raise it if labels look sloppy. */
  effort: "low" | "medium" | "high";
  timeoutMs: number;
};

export class Classifier {
  private readonly client: Anthropic | undefined;

  constructor(private readonly options: ClassifierOptions) {
    // The SDK also resolves ANTHROPIC_API_KEY and `ant auth login` profiles on its own,
    // so an explicitly empty key is the only reason to stay offline.
    this.client = options.apiKey === "" ? undefined : new Anthropic({ apiKey: options.apiKey });
  }

  get enabled(): boolean {
    return this.client !== undefined;
  }

  async classify(input: ClassifierInput): Promise<Classification & { source: "model" | "rules" }> {
    if (!this.client) return { ...ruleBasedClassification(input), source: "rules" };

    try {
      const response = await this.client.messages.parse(
        {
          model: this.options.model,
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          output_config: {
            effort: this.options.effort,
            format: zodOutputFormat(ClassificationSchema),
          },
          messages: [{ role: "user", content: describeSituation(input) }],
        },
        { timeout: this.options.timeoutMs },
      );

      // `parsed_output` is null when the model could not satisfy the schema.
      const parsed = response.parsed_output;
      if (!parsed) return { ...ruleBasedClassification(input), source: "rules" };

      // English only; the shared type keeps a second-language field, filled with the same text.
      return { ...parsed, explanation_ta: parsed.explanation_en, source: "model" };
    } catch (error) {
      // Any failure here is a reason to fall back, never a reason to fail the alert.
      if (error instanceof Anthropic.APIError) {
        console.warn(`classifier API error ${error.status}: ${error.message}`);
      } else {
        console.warn(`classifier unavailable: ${(error as Error).message}`);
      }
      return { ...ruleBasedClassification(input), source: "rules" };
    }
  }
}

/** "Purpose: Someone asked me to. the rest" → { purpose, note }, as the app writes it. */
export function splitPurpose(memo: string): { purpose?: string; note: string } {
  const match = /^Purpose: (Family|Shopping|Bills|Investment|Someone asked me to|Other)\.\s*(.*)$/s.exec(memo);
  return match ? { purpose: match[1], note: match[2] ?? "" } : { note: memo };
}

/** The facts the contract and the app already know, written out for the model. */
export function describeSituation(input: ClassifierInput): string {
  const { purpose, note } = splitPurpose(input.memo);
  const lines = [
    `The protected user is trying to send $${input.amountUsd.toLocaleString("en-US")}.`,
    `They chose this purpose: ${purpose ?? "(not given)"}.`,
    `Their own note: "${note || "(blank)"}"`,
    input.payeeIsNew
      ? "The recipient is new: the guardian has not approved them before."
      : "The recipient is one the guardian already approved.",
    `That is about ${input.amountVsUsual.toFixed(1)}x their usual weekly amount.`,
    `It is ${input.localHour}:00 local time.`,
    input.networkFlagCount > 0
      ? `There ${input.networkFlagCount === 1 ? "is 1 report" : `are ${input.networkFlagCount} reports`} about this recipient from other SafeSend families. They are unverified.`
      : "No reports were found about this recipient. That does not mean it is safe.",
  ];
  if (input.callDurationMinutes != null) {
    lines.push(`They say they have been on a phone call for ${input.callDurationMinutes} minutes.`);
  }
  return lines.join("\n");
}

/**
 * Rule-based guidance: the non-AI fallback.
 *
 * Keyword- and purpose-driven, deliberately simple. Its confidence is capped below the
 * model's, and the app shows the source, so a rule-based guess is never presented as more
 * than it is.
 */
export function ruleBasedClassification(input: ClassifierInput): Classification {
  const { purpose, note } = splitPurpose(input.memo);
  const text = note.toLowerCase();
  const has = (...words: string[]) => words.some((w) => new RegExp(`\\b${w}`, "i").test(text));
  const askedBySomeone = purpose === "Someone asked me to";

  let scriptId: number = SCAM_SCRIPT.UNKNOWN;
  let confidence = 0.25;

  if (has("safe account", "bank officer", "bank staff", "from the bank", "dbs", "ocbc", "uob", "protect my money", "secure my money")) {
    scriptId = SCAM_SCRIPT.DIGITAL_ARREST; // 2: bank officer / safe account
    confidence = 0.75;
  } else if (has("police", "mas\\b", "ica\\b", "mom\\b", "iras", "cpf", "investigation", "warrant", "arrest", "officer", "government", "money laundering")) {
    scriptId = SCAM_SCRIPT.FAKE_IMMIGRATION_OFFICER; // 1: government impersonation
    confidence = 0.75;
  } else if (has("new number", "changed number", "lost my phone", "accident", "hospital", "emergency")) {
    scriptId = SCAM_SCRIPT.VOICE_CLONE_ARREST; // 3: fake friend or family
    confidence = 0.6;
  } else if (has("job", "task", "part-time", "part time", "commission", "deposit to start", "registration fee")) {
    scriptId = SCAM_SCRIPT.JOB_TASK;
    confidence = 0.6;
  } else if (has("guaranteed", "double", "profit", "returns", "trading", "signal group", "mentor", "high yield")) {
    scriptId = SCAM_SCRIPT.INVESTMENT;
    confidence = 0.6;
  } else if (purpose === "Investment" && input.payeeIsNew) {
    scriptId = SCAM_SCRIPT.INVESTMENT;
    confidence = 0.45;
  }

  // "Someone asked me to" is a warning sign on its own, even with no keywords and no reports.
  if (askedBySomeone) confidence = Math.max(confidence, 0.55) + (scriptId === SCAM_SCRIPT.UNKNOWN ? 0 : 0.1);
  if (input.networkFlagCount > 0) confidence += 0.15;
  const unusuallyLarge = input.amountVsUsual >= 5;
  if (scriptId === SCAM_SCRIPT.UNKNOWN && input.payeeIsNew && unusuallyLarge) confidence = Math.max(confidence, 0.4);
  confidence = Math.min(0.9, confidence);

  const evidence: string[] = [];
  if (askedBySomeone) evidence.push("they say someone asked them to make this payment");
  if (input.payeeIsNew) evidence.push("the recipient is new");
  if (unusuallyLarge) evidence.push("the amount is much larger than usual");
  if (input.networkFlagCount > 0) {
    evidence.push(`there ${input.networkFlagCount === 1 ? "is 1 unverified report" : `are ${input.networkFlagCount} unverified reports`} about the recipient`);
  }
  const shows = evidence.length > 0 ? joinList(evidence) : "nothing stands out beyond the pause rule";
  const uncertain =
    input.networkFlagCount > 0
      ? "Reports can be wrong, so check with them before deciding."
      : "No reports were found, but that does not mean the recipient is safe.";

  const named = SCRIPT_PHRASE[scriptId];
  const explanation_en = named
    ? `This looks like ${named}: ${shows}. ${adviceFor(scriptId)} ${uncertain}`
    : askedBySomeone
      ? `They say someone asked them to send this, and ${shows}. Banks, police and government officers never ask anyone to move money to keep it safe. ${uncertain}`
      : `Paused because ${shows}. It may well be fine. ${uncertain}`;

  return {
    scriptId,
    confidence,
    explanation_en,
    explanation_ta: explanation_en,
    familyQuestionSuggested: questionFor(scriptId, purpose),
  };
}

const SCRIPT_PHRASE: Record<number, string | undefined> = {
  [SCAM_SCRIPT.FAKE_IMMIGRATION_OFFICER]: "a government official impersonation scam",
  [SCAM_SCRIPT.DIGITAL_ARREST]: "a \"safe account\" bank officer scam",
  [SCAM_SCRIPT.VOICE_CLONE_ARREST]: "a fake friend or family member scam",
  [SCAM_SCRIPT.JOB_TASK]: "a job or task scam",
  [SCAM_SCRIPT.INVESTMENT]: "an investment scam",
};

/** "a, b and c" — a list a busy guardian can read in one pass. */
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function adviceFor(scriptId: number): string {
  switch (scriptId) {
    case SCAM_SCRIPT.FAKE_IMMIGRATION_OFFICER:
      return "Government officers never ask anyone to transfer money by phone or message.";
    case SCAM_SCRIPT.DIGITAL_ARREST:
      return "Banks never ask customers to move money to a \"safe account\".";
    case SCAM_SCRIPT.VOICE_CLONE_ARREST:
      return "Call the family member on the number you already have, not the new one.";
    case SCAM_SCRIPT.JOB_TASK:
      return "A real job never asks you to pay to start or to move money for someone else.";
    case SCAM_SCRIPT.INVESTMENT:
      return "Guaranteed or unusually high returns are the most common sign of a fake investment.";
    default:
      return "";
  }
}

/** The one question to ask, fitted to the scam type and the stated purpose. */
function questionFor(scriptId: number, purpose: string | undefined): string {
  switch (scriptId) {
    case SCAM_SCRIPT.FAKE_IMMIGRATION_OFFICER:
    case SCAM_SCRIPT.DIGITAL_ARREST:
      return "Who exactly asked for this, and did they tell you to keep it secret or stay on the line?";
    case SCAM_SCRIPT.VOICE_CLONE_ARREST:
      return "Have you spoken to this person on their old number, or seen them on video?";
    case SCAM_SCRIPT.JOB_TASK:
      return "Why does this job need you to pay first, and have you met anyone from the company?";
    case SCAM_SCRIPT.INVESTMENT:
      return "How did you hear about this investment, and what return were you promised?";
  }
  switch (purpose) {
    case "Someone asked me to":
      return "Who asked you to send this, how did they contact you, and did they say to keep it quiet?";
    case "Bills":
      return "Which bill is this, and did the payment details come from a real letter or the official website?";
    case "Family":
      return "Did this family member ask you in person or on their usual number?";
    case "Shopping":
      return "Which shop is this, and did you find it yourself or did someone send you a link?";
    default:
      return "What is this payment for, and who gave you the payment details?";
  }
}
