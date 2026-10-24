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
    out.push(n > 0 ? `Reported by others (${n}). Reports can be wrong.` : "Reported by others. Reports can be wrong.");
  }
  if (facts.newRecipient || r === HOLD_REASON.NEW_PAYEE || r === HOLD_REASON.NETWORK_FLAG) {
    out.push("New recipient.");
  }
  if (facts.overSingleLimit || r === HOLD_REASON.OVER_CAP) {
    out.push(facts.limitLabel ? `Over your ${facts.limitLabel} limit.` : "Over your limit.");
  }
  if (r === HOLD_REASON.OVER_PERIOD_LIMIT) {
    out.push("Over your total limit for now.");
  }
  if (r === HOLD_REASON.CHECK_PENDING) out.push("Your guardian is checking on you.");
  if (r === HOLD_REASON.FROZEN) out.push("All payments are paused.");
  if (out.length === 0) out.push("Unusual payment.");
  return out;
}

export const SAFETY_TIP = "Banks and police never ask you to move money to keep it safe.";

export const OFFICIAL_NUMBER_TIP = "Bank or government caller? Call back on the official number, never the caller's.";

// ------------------------------------------------------------- risk reports

export type RiskReport = {
  source: string;
  reportedAt: number; // unix seconds, the latest report
  verified: boolean;
  summary: string;
  count: number;
};

/**
 * Reports about a recipient, read from the chain. Each one exists only because a guardian
 * stopped a real payment to this recipient and then reported it with their own Face ID, so
 * each is tied to a real event. External sources (such as Chainabuse) are future work.
 */
export function riskReports(options: { contact?: string; networkCount?: number; networkLastAt?: number }): RiskReport[] {
  const n = options.networkCount ?? 0;
  if (n === 0) return [];
  return [
    {
      source: "SafeSend guardians, recorded on Monad",
      reportedAt: options.networkLastAt ?? 0,
      verified: true,
      summary:
        n === 1
          ? "A guardian stopped a payment to this recipient and reported it."
          : `${n} guardians stopped payments to this recipient and reported them.`,
      count: n,
    },
  ];
}

/** "2 reports (1 verified, 1 unverified)". Never "scam", never "safe". */
export function reportCount(reports: RiskReport[]): number {
  return reports.reduce((n, r) => n + r.count, 0);
}

export function reportCountLabel(reports: RiskReport[]): string {
  const total = reportCount(reports);
  if (total === 0) return "No reports found";
  const verified = reports.filter((r) => r.verified).reduce((n, r) => n + r.count, 0);
  const unverified = total - verified;
  const parts = [verified ? `${verified} verified` : "", unverified ? `${unverified} unverified` : ""].filter(Boolean).join(", ");
  return `${total} report${total === 1 ? "" : "s"} (${parts})`;
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
  "Who asked for this payment?",
  "Was the recipient checked independently?",
  "Any rush or secrecy?",
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
