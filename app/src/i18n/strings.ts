/**
 * Copy, in English.
 *
 * Two rules enforced by review, not by code:
 *   1. No crypto words, ever. No wallet, token, gas, address, hash, AUSD or chain.
 *   2. Amounts are dollars, payees are names.
 */

/** English only. The type stays so call sites keep compiling, and any saved "ta" is ignored. */
export type Lang = "en";

type Entry = { en: string };

export const strings = {
  // ----------------------------------------------------------- shared
  appName: { en: "SafeSend" },
  tagline: { en: "A second pair of eyes on every unusual payment" },
  continue: { en: "Continue" },
  cancel: { en: "Cancel" },
  back: { en: "Back" },
  done: { en: "Done" },
  details: { en: "Details" },
  retry: { en: "Try again" },
  loading: { en: "One moment…" },
  faceId: { en: "Face ID" },
  tapFaceIdToContinue: { en: "Tap Face ID to continue" },

  // ------------------------------------------------------- onboarding
  welcomeTitle: {
    en: "Send money safely, with family looking out for you",
  },
  welcomeBody: {
    en: "Everyday payments go straight through. Anything unusual pauses until someone you trust has a look.",
  },
  createWithFaceId: { en: "Create with Face ID" },
  iAmStudent: { en: "I'm the one sending money" },
  iAmGuardian: { en: "I'm the guardian" },
  yourName: { en: "Your name" },

  inviteGuardianTitle: { en: "Invite your guardian" },
  inviteGuardianBody: {
    en: "Your guardian checks anything unusual before it leaves. They never have to set anything up.",
  },
  shareOnWhatsApp: { en: "Share on WhatsApp" },
  copyInviteLink: { en: "Copy invite link" },
  waitingForGuardian: { en: "Waiting for your guardian to accept…" },

  acceptInviteTitle: { en: "{name} wants you as their guardian" },
  acceptInviteBody: {
    en: "One tap. You will be asked before any unusual payment leaves.",
  },
  acceptWithFaceId: { en: "Accept with Face ID" },

  // --------------------------------------------------------- envelope
  envelopeTitle: { en: "Set the limits" },
  envelopeSummary: {
    en: "Every week {weekly} · Anything over {cap}, or to anyone new, asks me first",
  },
  envelopeSign: { en: "Approve once with Face ID" },
  weeklyAmount: { en: "Weekly top-up" },
  askMeAbove: { en: "Ask me for any single payment above" },

  // ------------------------------------------------- protected user home
  balance: { en: "Available" },
  nextFromGuardian: { en: "Next top-up: {when} {amount}" },
  rentAutoPays: { en: "Saved payment goes out {when}" },
  guardianIsYourThunai: { en: "{name} is your guardian" },
  activity: { en: "Activity" },
  noActivityYet: { en: "No payments yet." },
  sendMoney: { en: "Send" },

  arrivedFromGuardian: { en: "{when} {amount} from {name} arrived" },
  paidAutomatically: { en: "Paid automatically" },
  swiftComparison: { en: "A bank transfer can take 1–3 business days" },

  // -------------------------------------------------------- sending
  sendTitle: { en: "Send money" },
  toWhom: { en: "To" },
  payeeName: { en: "Their name" },
  amount: { en: "Amount" },
  whatsThisFor: { en: "What is this payment for?" },
  whatsThisForHint: {
    en: "Your guardian sees this if the payment needs checking.",
  },
  whatsThisForRequired: { en: "Please choose what this payment is for." },
  onACall: { en: "Are you on a call right now?" },
  onACallHint: {
    en: "Optional. It helps your guardian understand what is happening.",
  },
  sendNow: { en: "Send" },
  sent: { en: "Sent" },

  // ----------------------------------------------------------- hold
  heldForSafety: { en: "Paused for safety: {amount}" },
  heldWeAskedGuardian: { en: "We have asked your guardian to check." },
  heldNewPayee: { en: "You have not sent money to this person before." },
  heldOverCap: { en: "This is more than the limit your guardian set." },
  heldNetworkFlag: {
    en: "Other people have reported this recipient.",
  },
  heldCheckPending: {
    en: "Your guardian is checking on you right now.",
  },
  heldFrozen: { en: "Your family has paused all payments for now." },
  realOfficersNever: {
    en: "Banks, police and government officers will never ask you to move money to keep it safe.",
  },
  guardianReviewing: { en: "Your guardian is checking…" },
  moneyComesBackAutomatically: {
    en: "If no one answers, your money comes back automatically.",
  },
  familiesReportedThis: {
    en: "{count} report(s) about this recipient, latest {ago}.",
  },
  guardianStoppedThis: { en: "Stopped. {amount} is back." },
  guardianAllowedThis: { en: "Your guardian approved this." },
  noOneAnswered: { en: "No one answered, so your money is back." },

  // ------------------------------------------------- guardian screens
  allGood: { en: "All good" },
  allGoodSub: { en: "Nothing waiting." },
  lastAllowanceSent: { en: "Last added {when}: {amount}" },
  checkOnStudent: { en: "Check on {name}" },
  sendMoneyNow: { en: "Add money now" },

  studentNeedsYou: { en: "{name} needs you" },
  tryingToSend: {
    en: "{name} is trying to send {amount} to a new person for \"{memo}\".",
  },
  looksLikeScam: { en: "This looks like a {script}." },
  onCallForMinutes: { en: "{name} has been on a call for {minutes} minutes." },
  stopIt: { en: "Stop transfer" },
  allowIt: { en: "Approve" },
  notSureStopIt: {
    en: "Not sure? Stop it. {name} gets the money back.",
  },

  // ---------------------------------------------------- check / liveness
  checkingOnStudent: { en: "Checking on {name}…" },
  signedOnTheirPhone: {
    en: "Confirmed on {name}'s phone, {ago}",
  },
  provesItsReallyThem: {
    en: "This shows it is really {name}'s own phone answering. A voice on a call can be faked; this cannot.",
  },
  doesNotProveSafe: {
    en: "It does not prove they are safe. Call them on video too.",
  },
  noReplyYet: {
    en: "No reply yet. Any payment to someone new will be paused.",
  },
  checkRequestTitle: { en: "Your guardian is checking on you" },
  checkRequestBody: {
    en: "Tap Face ID to show it is really you.",
  },
  imNotSafe: { en: "I can't talk freely" },

  // --------------------------------------------------------- network
  reportThisPayee: { en: "Report this recipient" },
  reportThisPayeeHeading: { en: "Warn other families" },
  reportThisPayeeBody: {
    en: "Others paying this recipient will see your report. It never blocks anyone.",
  },
  reportSent: { en: "Thank you. Your report was added." },
  familiesProtected: { en: "How SafeSend is doing" },

  // ---------------------------------------------------------- details
  signedBy: { en: "Confirmed by {name}" },
  receiptNumber: { en: "Receipt" },
  settledIn: { en: "Settled in {latency}" },
  sessionActive: { en: "Session active · {minutes} min" },
  viewOnExplorer: { en: "View the receipt" },
  language: { en: "Language" },
  everythingRestored: { en: "Everything is back." },
} satisfies Record<string, Entry>;

export type StringKey = keyof typeof strings;

/** Looks up a string and fills `{placeholders}`. English is the default. */
export function t(
  key: StringKey,
  lang: Lang = "en",
  vars: Record<string, string | number> = {},
): string {
  const entry = strings[key] as Entry;
  let value = entry.en;
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}

/** The scam script names, as a family should hear them. */
export const scriptNames: Record<number, Entry> = {
  0: { en: "unusual request" },
  1: { en: "government official impersonation scam" },
  2: { en: "\"safe account\" bank scam" },
  3: { en: "fake family member scam" },
  4: { en: "job scam" },
  5: { en: "investment scam" },
};

export function scriptName(scriptId: number, lang: Lang = "en"): string {
  const entry = scriptNames[scriptId] ?? scriptNames[0]!;
  return entry.en;
}
