<p align="center"><img src="app/app/logo.png" alt="SafeSend. Lock. Review. Send." width="180"></p>

# SafeSend

**SafeSend makes crypto transfers safer for people who are new to crypto, especially older adults and young people in Singapore.** It combines checks on who you are paying, payment pauses you can configure, and a simple review by a trusted family member.

Web3 for Social Good 2026 (SMU × GSR Foundation × UMA) · **Tech Track** · Monad testnet (chain 10143)

**The golden rule:** fixed smart-contract rules and authorised people decide. AI only explains and guides. AI can never move money.

---

## 1. The problem

From the Singapore Police Force's *Mid-Year Scam and Cybercrime Brief 2026* ([PDF](https://www.police.gov.sg/-/media/SPF/Media-Room/Statistics/Mid-Year-Scam-and-Cybercrime-Brief-2026/Mid-Year-Scam-and-Cybercrime-Brief-2026.pdf)):

- About **S$410.6 million** was lost to scams in the first half of 2026 (para 3).
- Cryptocurrency losses were about **S$65.5 million, or 16.0%** of total scam losses (para 11). The SPF notes that "scammers leverage cryptocurrency as transactions are irreversible and difficult to trace".
- The average loss per **elderly victim rose to S$42,347**, the highest of any age group (para 17).
- Government official impersonation, a script SafeSend's guidance targets, mostly hit victims aged 65 and above (Annex).

Safe and Coinbase already offer limits, delays, trusted contacts and recipient checks, built for people who already understand crypto. **SafeSend makes the same protections easy to understand and use** for beginners and their families: simple setup, reasons in plain words, and a guided review for the guardian.

## 2. Who it is for

| Protected user | Guardian |
|---|---|
| **Mdm Tan, 68.** Gets a call from a "bank officer" saying her money must be moved to a "safe account". | **Wei Ming**, her son. Reviews any paused payment with a checklist, and can add a backup guardian. |
| **A 16-year-old** with a first crypto account, tempted by "guaranteed" returns from a group chat. | **Their parent.** Approves anything unusual before it leaves. |

## 3. How it works

```
Protected user taps Send
        │
"What is this payment for?"  Family · Shopping · Bills · Investment · Someone asked me to · Other
        │
Will the contract pause this?
  ├─ no  (saved recipient, within limits, no reports) ──► paid straight away
  └─ yes ──► warning screen
              • why it will be paused, in plain words
              • "Banks, police and government officers will never ask you to move money to keep it safe."
              • reports about the recipient: source, date, verified or not
              [Cancel transfer] → nothing is sent
              [Ask my guardian to check] → the contract holds the money in the vault
                        │
              Guardian (or backup guardian) review, in this order:
               1. amount, recipient, how long it has waited
               2. why it was paused + what the user said it is for
               3. reports, with source, date and status
               4. checklist + guidance (AI or fixed rules, labelled) + a suggested question
               5. Call [name], using only the number saved at setup
               6. "Use the official number from their website, never one the caller gave."
               7. [Stop transfer] (red)   [Approve] (green, only after "I have spoken to [name] and checked this request")
                        │
          Stop ─────────┼──────── Approve ──────────────────── Nobody answers
   money back to user   │   2-minute cooling-off, then paid     money back to user automatically
                        │   (the user can still cancel)
   The user can also cancel a paused payment herself at any time: it only ever returns the money to her.
```

### When a payment is paused (the contract decides)

| Rule | What the user reads | Contract reason |
|---|---|---|
| The recipient has been reported | "Reported by others (2). Reports can be wrong." | `NETWORK_FLAG` |
| The recipient is new | "New recipient." | `NEW_PAYEE` |
| One payment is over the limit | "Over your $1,000 limit." | `OVER_CAP` |
| Payments in a day or week add up past the total limit | "Over your total limit for now." | `OVER_PERIOD_LIMIT` |

### Reports, shown honestly

- Reports are **real and onchain**. A guardian can only report a recipient after actually stopping a payment to them, with their own Face ID, so every report is tied to a real stopped payment (shown as **verified**).
- Every report shows **where it came from** and **when**. Counts read like "2 reports (2 verified)", never "scam".
- No reports shows **"No reports found"**, never "safe".
- Every report has a **"Wrong report? Ask to correct"** link, and the reported party can attach a public rebuttal onchain.
- Reports are permanent by design: nobody, including us, can quietly erase evidence about a scammer.

### Guidance for the guardian (AI only explains)

The guardian sees one or two short sentences on what the evidence shows and what is uncertain, plus one question fitted to the stated purpose. It comes from a free AI model (`openai/gpt-oss-120b` on Groq, any OpenAI-compatible API works) when one is configured, and from fixed rules otherwise. The screen always says which. The pause has already happened before the guidance runs, and the guidance cannot change it. Evaluation on 20 scenarios ([`docs/ai-evaluation.md`](docs/ai-evaluation.md)): 10 used once to tune the AI prompt, and 10 fresh ones written afterwards and never used for tuning.

| Guidance | Scams warned (all 20) | False alarms (all 20) | Scams warned (fresh 10 only) |
|---|---|---|---|
| Fixed rules (fallback) | 7 / 10 | 3 / 10 | 2 / 5 |
| AI (gpt-oss-120b, free on Groq) | **10 / 10** | 3 / 10 | **5 / 5** |

The AI catches every scam, including ones with no obvious keywords (a dating-app "friend", unlocking game winnings, a "son" on a new number), which the rules miss. Both still raise false alarms on genuine payments that mention police or banks. The guardian makes the final decision either way.

### The protected user stays in control

- **Cancel any time:** while a payment is paused, the protected user can cancel it herself. Cancelling can only return the money to her, so it is always safe to allow, even under pressure.
- **Cooling-off after approval:** an approved payment waits a short time (2 minutes in the demo) before it is sent. If the approval was given under pressure, she can still cancel.

### Guardian settings

- **One-screen setup:** the weekly top-up, the single-payment limit, an optional daily total and the protected user's phone number, all on one screen.
- **Total limit:** "no more than $X in total every day or week without asking me". Signed with the guardian's Face ID and enforced by the contract.
- **Backup guardian:** a second person who can stop or approve a paused payment if the main guardian cannot be reached. The main guardian invites them, and the backup can act only after the main guardian approves them with Face ID. A backup cannot change any limits.
- **Phone number:** saved by the guardian on their own phone. The Call button never uses a number from a message.

### What if the guardian is the problem?

Sometimes the person pressuring an older adult is family. SafeSend limits what a guardian can do:

- A guardian can only **stop or approve** a payment the protected user started. They can never move money, send it anywhere, or change the recipient. The contract enforces this.
- **Stop always returns the money to the protected user**, never to the guardian.
- A **backup guardian** can be added, so one person is never the only check. (Letting the protected user choose the backup themselves is planned.)
- **No answer means the money comes back** to the protected user, so a guardian cannot trap funds by staying silent.
- Every decision is a public onchain event, so it can be reviewed later.

### Made for older eyes

Body text is 18px or larger, buttons are at least 56px tall, text contrast is at least 4.5:1, and there is a **Large text** switch. Main screens have no crypto words; technical details live under **Details**.

## 4. Why Web3

SafeSend could not keep its main promise with an ordinary app and database:

1. **Nobody can override the rules, including SafeSend.** The pause rules and limits live in a smart contract. Our server only relays; it cannot release a paused payment, raise a limit or move money. A scammer who tricks our support staff, or an insider, still cannot get the money out.
2. **Only the guardian's own Face ID releases money.** The guardian's approval is a passkey signature checked inside the contract (P256 verification onchain). A server or a stolen password cannot fake it.
3. **The fail-safe does not depend on us.** If nobody answers, anyone can trigger the expiry and the money goes back to the sender. Even if SafeSend shut down, the funds would not be stuck.
4. **Reports are a shared public good.** Scam reports are stored in a public contract, not a private blocklist. Any wallet, exchange or app can read them, and each one is tied to a real stopped payment, which makes spam reports costly.
5. **Every decision is auditable.** Pauses, stops, approvals and expiries are public events. Families, researchers and regulators can check what happened without trusting our word.

## 5. Feasibility and sustainability

**Path to real use**

| Stage | What | Status |
|---|---|---|
| 1. Prototype | Full journey on Monad testnet with test money | Done |
| 2. Pilot | 10–20 families through SMU and community groups (for example, seniors' activity centres) on testnet; measure how often guardians stop and how long reviews take | Next |
| 3. Mainnet | Real stablecoins on an EVM chain, after a security audit of the contract | Later |
| 4. Embed | Offer the pause-and-review flow as a module that wallets and exchanges add to their own apps | Later |

**Who pays**

- **Families:** free. People most at risk should not have to pay for protection.
- **Wallets and exchanges:** pay to embed SafeSend's protection, because scams cost them in support work, refunds and reputation, and Singapore's regulators expect anti-scam measures.
- **Grants:** social-impact funding (for example GSR Foundation) for the pilot and the audit.

**Running costs are low:** the contract costs nothing to run; the relayer pays small network fees; the AI guidance is optional and falls back to fixed rules at no cost.

**Risks and how we handle them**

- *Guardian too slow or unavailable:* backup guardian, and the money returns automatically.
- *False reports:* reports never block on their own, show whether they are verified, and can be corrected.
- *Crypto is still unfamiliar to many seniors:* plain words, large text, and the family doing the checking.
- *Partnerships:* links with ScamShield and banks would need agreements we do not have yet.

## 6. Running it locally

Needs Node 22+, pnpm 9+ and [Foundry](https://getfoundry.sh).

```bash
pnpm install
cp .env.example .env     # fill in MONAD_RPC_URL, the three private keys, RELAYER_ADDRESS and AGENT_ADDRESS
pnpm dev                 # relayer :8787, agent :8788, app http://localhost:8081
```

The keys need testnet MON (https://faucet.monad.xyz). The relayer pays gas and the agent runs expiries. Neither can move anyone's money: spending needs the protected user's signature, and releasing a paused payment needs a guardian's Face ID, checked by the contract.

### Checks

```bash
cd contracts && forge test               # 126 passing
pnpm parity                              # TypeScript and Solidity agree on every signing challenge
pnpm typecheck && pnpm -r test
pnpm e2e                                 # the whole journey on a local chain
pnpm e2e:testnet                         # the same journey on Monad testnet (needs pnpm dev running)
pnpm --filter @thunai/agent evaluate     # regenerates docs/ai-evaluation.md
```

## 7. Deployment

### Contracts (Monad testnet, chain 10143)

| Contract | Address |
|---|---|
| Vault (`ThunaiVault`) | `0x918022A5aDd2d250617ec64F7b38C5EEcf28E48f` |
| Reports (`ScamSignals`) | `0x3b7e4d3B44E91d2C0396d781F2BcdfE5fa87Cd48` |
| Stand-in deposit token (tCTK) | `0xc79f8fa19F8D197a42100BbEf95F2db989266d3f` |
| Stand-in dollar (tAUSD) | `0xA880e099Ca5134a992B3aEa6c7D7099ae4802771` |

To deploy your own: set `RELAYER_ADDRESS` and `AGENT_ADDRESS` in `.env` first (or both roles default to the deployer), run `pnpm contracts:deploy`, then mint tCTK to the relayer and tAUSD to the vault as backing. Both tokens are testnet stand-ins with open minting.

### Website and servers (all on Vercel)

| Part | Vercel project | How |
|---|---|---|
| Landing page, with the app at `/app` | `safesend` | `node scripts/build-web.mjs`, then `cd frontend && vercel deploy --prod` |
| Relayer and agent, as one serverless function | `safesend-api` | `node scripts/build-api-vercel.mjs`, then `cd .vercel-api && vercel deploy --prod` |

- The website forwards `/relayer/*` and `/agent/*` to `safesend-api` (`RELAYER_URL` and `AGENT_URL` on the `safesend` project), so the app, its servers and its passkeys share one origin.
- Server state (display names, invites, alert briefs) lives in **Vercel Blob**. The money, passkeys and rules live on the chain.
- Serverless has no background timer, so an unanswered pause is refunded **as soon as anyone opens it**, and a **Vercel Cron** job sweeps once a day.
- Secrets are Vercel environment variables. The deployer key is never uploaded.

Contract and package names (`ThunaiVault`, `ScamSignals`, `@thunai/*`) are kept on purpose: renaming them would change the signing domain, every passkey challenge and the deployment files. See [`docs/safesend-map.md`](docs/safesend-map.md).

## 8. Demo video

A real recording of the app on Monad testnet, two phones (Mdm Tan and Wei Ming): signup, rules, the scam paused with verified reports, the guided review, Stop, a genuine gift approved, Silent SOS, Details, and Forget this device.

### Demo script (about 3 minutes)

1. **Problem (30s):** S$410.6M lost in H1 2026; S$65.5M from crypto wallets; elderly lose most; crypto cannot be reversed.
2. **Setup (20s):** Wei Ming becomes Mdm Tan's guardian, saves her phone number, sets a weekly total limit and adds a backup guardian.
3. **Normal payment (20s):** a small payment to a saved recipient goes straight through.
4. **Scam (60s):** a "bank officer" asks for S$3,000. Mdm Tan picks "Someone asked me to". The payment is paused and she sees why. Wei Ming sees the reports, the checklist and the guidance, calls her and taps **Stop**. The money is back.
5. **Guardian unavailable (20s):** the backup guardian steps in, or nobody answers and the money returns automatically.
6. **Why it is better (30s):** Safe and Coinbase have the features. SafeSend makes them understandable for beginners and families.

## 9. Known limits

- Reports come only from SafeSend guardians who stopped a payment. Chainabuse's free API allows 10 lookups a month, so a real integration needs partner access; see [`docs/chainabuse.md`](docs/chainabuse.md).
- The AI evaluation uses 20 hand-written scenarios (10 fresh). False alarms on genuine payments that mention police or banks remain; testing with real users is planned for refinement.
- A backup guardian who clears their phone must be invited again; "restore with Face ID" only finds main guardians and protected users.
- Testnet only, with stand-in dollars.
- On serverless hosting, an unanswered pause is refunded when someone opens it or by the daily cron, not to the exact minute.

## 10. Licence

MIT. See [`LICENSE`](LICENSE).
