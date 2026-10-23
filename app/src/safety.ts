import { HOLD_REASON } from "@thunai/shared";

/**
 * SafeSend's plain-language layer.
 *
 * Everything here EXPLAINS. Nothing here decides: whether a payment is paused is the
 * contract's call (ThunaiVault._holdReason), and whether it goes ahead is the guardian's.
 * The predictions below only let the app say "this will be paused" before it happens.
 */

// ------------------------------------------------------------------ purpose

/** "What is this payment for?" The answer travels with the payment to the guardian. */
export const PURPOSES = [
  "Family",
  "Shopping",
  "Bills",
  "Investment",
  "Someone asked me to",
  "Other",
] as const;

export type Purpose = (typeof PURPOSES)[number];

const PURPOSE_PREFIX = "Purpose: ";

/** Puts the chosen purpose at the front of the note, which the guardian already sees. */
export function memoWithPurpose(purpose: Purpose, note: string): string {
  const rest = note.trim();
  return rest ? `${PURPOSE_PREFIX}${purpose}. ${rest}` : `${PURPOSE_PREFIX}${purpose}.`;
}

/** Splits a note back into the purpose and the person's own words. */
export function splitMemo(memo: string | undefined): { purpose?: Purpose; note: string } {
  if (!memo) return { note: "" };
  if (!memo.startsWith(PURPOSE_PREFIX)) return { note: memo };
  const body = memo.slice(PURPOSE_PREFIX.length);
  const purpose = PURPOSES.find((p) => body.startsWith(`${p}.`));
  if (!purpose) return { note: memo };
  return { purpose, note: body.slice(purpose.length + 1).trim() };
}

// ------------------------------------------------------------------ reasons

export type PauseFacts = {
  reason?: number; // the contract's hold reason, once there is one
  newRecipient?: boolean;
  reportCount?: number;
  overSingleLimit?: boolean;
  limitLabel?: string;
};

/** Why it was paused, as a short list of plain sentences. No "escrow", "gas" or "nonce". */
export function pauseReasons(facts: PauseFacts): string[] {
  const out: string[] = [];
  const r = facts.reason;
  if ((facts.reportCount ?? 0) > 0 || r === HOLD_REASON.NETWORK_FLAG) {
    const n = facts.reportCount ?? 0;
    out.push(
      n > 0
        ? `Other people have reported this recipient (${n} report${n === 1 ? "" : "s"}). Reports can be wrong, so your guardian checks.`
        : "Other people have reported this recipient. Reports can be wrong, so your guardian checks.",
    );
  }
  if (facts.newRecipient || r === HOLD_REASON.NEW_PAYEE || r === HOLD_REASON.NETWORK_FLAG) {
    out.push("You have not sent money to this person before.");
  }
  if (facts.overSingleLimit || r === HOLD_REASON.OVER_CAP) {
    out.push(
      facts.limitLabel
        ? `This is more than the ${facts.limitLabel} limit your guardian set for one payment.`
        : "This is more than the limit your guardian set for one payment.",
    );
  }
  if (r === HOLD_REASON.OVER_PERIOD_LIMIT) {
    out.push("Together with your other payments recently, this goes over the total your guardian set.");
  }
  if (r === HOLD_REASON.CHECK_PENDING) out.push("Your guardian is checking on you right now.");
  if (r === HOLD_REASON.FROZEN) out.push("Your family has paused all payments for now.");
  if (out.length === 0) out.push("This payment is different from your usual ones.");
  return out;
}

export const SAFETY_TIP =
  "Banks, police and government officers will never ask you to move money to keep it safe.";

export const OFFICIAL_NUMBER_TIP =
  "If someone says they are from a bank or the government, call them back using the official number on their website. Never use a number the caller gave.";

// ------------------------------------------------------------- risk reports

export type RiskReport = {
  source: string;
  reportedAt: number; // unix seconds
  verified: boolean;
  summary: string;
  sample: boolean; // demo data, clearly labelled on screen
};

/**
 * SAMPLE reports for the demo, keyed by the masked contact the relayer shows
 * (e.g. "+65 •••• 4567"). Clearly marked as samples wherever they appear. A real
 * source (Chainabuse or similar) is Phase 3 work, after checking data access.
 */
const SAMPLE_REPORTS: Record<string, Omit<RiskReport, "sample">[]> = {
  "4567": [
    {
      source: "Sample: community report",
      reportedAt: Date.UTC(2026, 9, 12) / 1000,
      verified: true,
      summary: "Caller said they were a bank officer and asked for money to be moved to a \"safe account\".",
    },
    {
      source: "Sample: community report",
      reportedAt: Date.UTC(2026, 9, 20) / 1000,
      verified: false,
      summary: "Asked for an urgent transfer to release a parcel.",
    },
  ],
};

function sampleKey(contact: string | undefined): string | undefined {
  if (!contact) return undefined;
  const digits = contact.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : undefined;
}

/**
 * Every report we know about for a recipient: the SafeSend family network's onchain
 * reports, plus clearly labelled samples in the demo.
 */
export function riskReports(options: {
  contact?: string;
  networkCount?: number;
  networkLastAt?: number;
}): RiskReport[] {
  const reports: RiskReport[] = [];
  const n = options.networkCount ?? 0;
  for (let i = 0; i < n; i++) {
    reports.push({
      source: "SafeSend families (a guardian stopped a payment and reported it)",
      reportedAt: options.networkLastAt ?? 0,
      verified: false,
      summary: "A guardian stopped a payment to this recipient and reported it.",
      sample: false,
    });
  }
  const key = sampleKey(options.contact);
  for (const r of (key && SAMPLE_REPORTS[key]) || []) reports.push({ ...r, sample: true });
  return reports;
}

/** "2 reports (1 verified, 1 unverified)". Never "scam", never "safe". */
export function reportCountLabel(reports: RiskReport[]): string {
  if (reports.length === 0) return "No reports found";
  const verified = reports.filter((r) => r.verified).length;
  const unverified = reports.length - verified;
  return `${reports.length} report${reports.length === 1 ? "" : "s"} (${verified} verified, ${unverified} unverified)`;
}

/** Where someone goes if a report about them, or their recipient, is wrong. */
export function correctionLink(subject: string): string {
  const to = process.env.EXPO_PUBLIC_CORRECTIONS_EMAIL ?? "";
  return `mailto:${to}?subject=${encodeURIComponent("SafeSend report correction")}&body=${encodeURIComponent(
    `I think this report is wrong.\n\nRecipient: ${subject}\nWhy it is wrong:\n`,
  )}`;
}

// ------------------------------------------------------- guardian checklist

export const GUARDIAN_CHECKLIST = [
  "What is the payment for, and who asked for it?",
  "How was the person and their payment details checked, without using details from the request itself?",
  "Is anyone rushing them, or asking them to keep it secret?",
];

/**
 * A fixed, non-AI hint based on the stated purpose. This is also the fallback the
 * Phase 3 AI guidance must fall back to. It never changes the hold.
 */
export function purposeHint(purpose: Purpose | undefined, name: string): string | undefined {
  switch (purpose) {
    case "Someone asked me to":
      return `${name} says someone asked for this payment. This is how most scams start. Ask who asked, how they got in touch, and whether they said to keep it quiet.`;
    case "Investment":
      return `Investment offers with quick or "guaranteed" returns are a common scam. Ask how ${name} heard about it and whether they have met anyone in person.`;
    case "Bills":
      return `Ask ${name} which bill, and check the payment details against a real letter or the official website, not a message.`;
    case "Family":
      return `If a family member asked by message or a new number, call that family member on the number you already have.`;
    default:
      return undefined;
  }
}
