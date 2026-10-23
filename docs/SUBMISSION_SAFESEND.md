# SafeSend — DoraHacks submission (Tech Track)

## One line

SafeSend pauses risky crypto payments, explains why in plain words, and lets a trusted family member check before anything leaves.

## Short description (paste into DoraHacks)

Singapore lost S$410.6M to scams in the first half of 2026, and S$65.5M of it left from victims' crypto wallets. Older adults lose the most, and a crypto transfer usually cannot be reversed.

SafeSend is a mobile web app on Monad testnet for people new to crypto and their families. When a payment goes to someone new, to someone other people have reported, or over a limit the guardian set (for one payment or in total over a day or week), a smart contract pauses it. The money waits in the vault, not with the recipient. The sender sees why in plain words, says what the payment is for, and can cancel or ask their guardian to check. The guardian gets a guided review: the reasons, the reports (with source, date and whether verified), a short checklist, AI-written or rule-based guidance labelled as such, and a Call button that only uses the number they saved themselves. Stop sends the money back. Approve, which requires confirming "I have spoken to them and checked this request", pays it. A backup guardian can step in, and if nobody answers the money returns automatically.

Safe and Coinbase already have limits, delays and trusted contacts. SafeSend makes them understandable for beginners and families.

**Golden rule:** contract rules and authorised people decide. AI only explains; it can never move or release money.

## Problem

- S$410.6M lost to scams in Singapore, H1 2026 (para 3); S$65.5M (16.0%) from crypto (para 11) — SPF Mid-Year Scam and Cybercrime Brief 2026.
- Average loss per elderly victim: S$42,347, the highest of any age group (para 17).
- Common scripts: fake bank officer and "safe account", government official impersonation, fake family member on a new number, job scams, investment scams.
- Existing protections are built for people who already understand crypto.

## Solution

| Step | Who | What happens |
|---|---|---|
| 1 | Protected user | Chooses what the payment is for |
| 2 | Contract | Pauses it if the recipient is new or reported, or a limit is exceeded |
| 3 | Protected user | Sees why in plain words and a safety tip; cancels or asks the guardian |
| 4 | Guardian (or backup) | Guided review: reasons, purpose, honest reports, checklist, guidance, Call button |
| 5 | Guardian | Stop (money back) or Approve (after confirming they spoke to the user) |
| 6 | Contract | If nobody answers, the money returns to the sender automatically |

## Impact

- Interrupts the moment scams depend on: a person alone, under pressure, making an irreversible transfer.
- "Someone asked me to" is collected for every unusual payment. It is the clearest single signal of a scam, and it reaches the guardian even when there are no reports.
- Honest reports: "No reports found" is never shown as "safe", so a new scam address does not get a false all-clear.

## Technology

- Monad testnet. Vault `0x9cFe6bC36F8C1aC0776a67957eB81CF0136681C9`, reports `0xb51732F6b45878fe24853776B28c3D86fCc350De`.
- Solidity (Foundry): pause rules, rolling total limit, backup guardian, passkey (P256) approval checked onchain. 116 tests.
- Relayer pays gas and holds no spending power. Agent writes guidance (Anthropic model or rule-based fallback).
- Expo / React Native web app with Face ID passkeys.
- Evaluation of the guidance on 10 scenarios: `docs/ai-evaluation.md`.

## Screens to capture for the PDF

1. Send: the "What is this payment for?" choices.
2. Warning: "Why it was paused", the safety tip, reports, Cancel transfer / Ask my guardian to check.
3. Protected user's paused screen: "Your money is safe", countdown.
4. Guardian review, top half: amount, reasons, purpose, reports.
5. Guardian review, bottom half: checklist, guidance, Call button, official-number tip, Stop / Approve.
6. Guardian home: total limit and backup guardian settings, Large text.
7. Result: "Your guardian stopped this. $3,000 is back."

## Demo video outline (3 minutes)

See section 6 of `README.md`.
