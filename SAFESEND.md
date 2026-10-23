# SafeSend — Build Guide for Antigravity (based on Companion)

> Put this file in the root of the project as `SAFESEND.md`.
> Start every Antigravity task with: **"Read SAFESEND.md first. Do only Phase X."**

---

## 0. Before you start (do these by hand)

1. Clone the project into a folder named `SafeSend`.
2. **Save storage.** Clone only shallow:
   ```bash
   git clone --depth 1 <repo-url> SafeSend
   cd SafeSend
   ```
   Run `npm install` / `pnpm install` only inside the folders you actually work on (`contracts`, `app`, `frontend`).
   If storage is still too low, use **GitHub Codespaces** (Code → Codespaces → Create) and use Antigravity there, or work in the browser.
3. **Ask the mentor** that building on Companion is acceptable (it was submitted to Monad Metropolis).
4. Put this file in the project root as `SAFESEND.md`.

---

## 1. Project summary (tell the AI this)

**SafeSend** makes crypto transfers safer for people with limited crypto experience — **older adults and young people in Singapore** — by combining **recipient risk checks**, **configurable transaction holds**, and a **simple review process with trusted family members**.

- Hackathon: Web3 for Social Good 2026 (SMU × GSR Foundation × UMA), **Tech Track**.
- Problem: Singapore lost S$410.6M to scams in H1 2026; S$65.5M (16%) was sent from victims' crypto wallets/accounts to scammers (SPF Mid-Year Scam and Cybercrime Brief 2026). Elderly victims have the highest average losses. Crypto transfers usually cannot be reversed.
- Positioning vs existing products: Safe and Coinbase already offer limits, delays, trusted contacts and recipient checks. SafeSend's improvement is **making them easy to understand and use** for beginners and their families: simple setup, plain-language reasons, and a guided guardian review.

**Golden rule:** fixed smart-contract rules and authorised people decide. **AI only explains and guides. AI can never move money.**

---

## 2. What Companion already has (REUSE — do not rebuild)

| Need | Already in Companion |
|---|---|
| Family vault, balances, per-family rules | `contracts/src/ThunaiVault.sol` |
| Holds for new payee / unusual amount / reported payee → escrow | `ThunaiVault.sol` (HoldOpened, resolveHold, expireHold) |
| Guardian stops or releases with passkey | `resolveHold` + P256 passkey check |
| Guardian silent → money returns to sender | `expireHold()` |
| Shared scam reports | `contracts/src/ScamSignals.sol` |
| Tests | `contracts/test/*.t.sol` |
| Indexer for history | `indexer/` (Envio) |
| Mobile web app: student, guardian, hold screens | `app/app/student/*`, `app/app/guardian/*`, `app/app/hold/[id].tsx` |
| Landing page | `frontend/` |
| Optional AI explanation | already in the agent (rules decide; AI explains) |
| Chain | **Monad testnet (10143)** — keep it |

---

## 3. What SafeSend must change or add

### A. Rename and re-target (must, Oct 25)
- Rename product text "Companion / Thunai" → **SafeSend** in UI, README, page titles. Keep contract names if renaming risks breaking deployments; note it in README.
- Roles: "student" → **Protected user**, "parent" → **Guardian**. Add a **Backup guardian** label if the contract supports a second guardian; if not, list it as Phase 3 work.
- Personas in copy: **Mdm Tan (68) + son Wei Ming**, and **a 16-year-old + parent**.
- Replace India/US story and numbers with the Singapore data in Section 1.

### B. Hold rules (check they exist; add what's missing)
1. **Recipient has risk reports** → hold.
2. **First-time recipient** → hold (consider amount too).
3. **Single transfer OR cumulative total in a period over the limit** → hold. If only single-amount exists, add a rolling daily/weekly total.

### C. Plain-language warning screen (must)
On the send/hold screen show:
- **Why it was paused**, as a bullet list in plain words (no "escrow", "nonce", "gas").
- Tip: *"Banks, police and government officers will never ask you to move money to keep it safe."*
- Buttons: **Cancel transfer** and **Ask my guardian to check**.
- Ask the user **"What is this payment for?"** (Family · Shopping · Bills · Investment · Someone asked me to · Other) and pass the answer to the guardian.

### D. Risk information done honestly (must)
For each report show: **source**, **report date**, **verification status (verified / unverified)**, and a **"Wrong report? Request correction"** link.
- Never say "2 reports = scam". Say *"2 reports (1 verified, 1 unverified)"*.
- An address with no reports must show **"No reports found"**, never "Safe".
- Demo data: use clearly labelled **sample** reports. Chainabuse integration = Phase 3 (check data access first).

### E. Guided guardian review (must — the core feature)
Guardian hold screen, top to bottom:
1. Amount, recipient, time waiting.
2. **Why it was paused** (same reasons as the user saw) + the user's stated purpose.
3. Risk reports with source/date/status.
4. **Checklist before deciding:**
   - What is the payment for, and who requested it?
   - How was the recipient and wallet address independently verified?
   - Is anyone creating urgency or asking to keep it secret?
5. **Call [name]** button → uses the phone number saved at setup (never one from a message).
6. If the request claims to be from a bank/government: *"Verify using the official number from their website, not one the caller gave."*
7. Big buttons: **Stop transfer** (red) / **Approve** (green). Approve asks: *"I have spoken to [name] and checked this request."*

### F. AI guidance (Phase 3, after Oct 25)
- **Explain the evidence:** turn transfer details + sourced reports into 2–3 sentences, including what is uncertain.
- **Guide the review:** use the user's stated purpose to suggest specific questions. Example: no reports, but purpose = "a bank officer asked me to move money to a safe account" → strong targeted warning.
- Must have a non-AI fallback text. AI output never changes hold decisions.
- **Test it:** 10 sample scenarios (5 scam, 5 legitimate). Record whether the guidance helped spot scams without blocking real payments. Put results in `docs/ai-evaluation.md`.

### G. Elder-friendly UI (Phase 2–3)
Base font ≥ 18px, buttons ≥ 56px tall, contrast ≥ 4.5:1, one main action per screen, "Large text" setting, no crypto jargon on main screens (technical details under "Details").

---

## 4. Phases

| Phase | When | Goal | Expected output |
|---|---|---|---|
| **1. Understand** | Oct 24 morning | AI reads the code, maps it | `docs/safesend-map.md`: what exists vs Section 3 |
| **2. Core demo** | Oct 24 | A–E working on Monad testnet | Full journey works: send → pause → plain warning → guardian review with checklist → stop/approve |
| **Submit** | **Oct 25** | DoraHacks Tech Track | Repo link + description + PDF (problem, solution, impact, flow diagram, annotated screens) |
| **3. Refine** | Nov 1–20 | F, backup guardian, cumulative limits, Chainabuse check, polish G | AI guidance + evaluation, demo video |
| **4. Final** | Nov 21–26 | Pitch + live demo at SMU | 3-min demo, slides, rehearsed Q&A |

---

## 5. Copy-paste prompts for Antigravity

**Prompt 1 — Understand (no code changes)**
> Read SAFESEND.md. Do Phase 1 only. Explore this repo (contracts/, app/, frontend/, indexer/). Do not change any code. Write docs/safesend-map.md with: (1) a table of every requirement in Section 3 (A–G) and whether it already exists, partly exists, or is missing, with file paths; (2) the exact commands to build, test and run the app locally; (3) risks of renaming anything. Then stop.

**Prompt 2 — Rename and re-target (Section 3A)**
> Read SAFESEND.md and docs/safesend-map.md. Do Section 3A only. Rename all user-facing text from Companion/Thunai to SafeSend, change roles to Protected user / Guardian, replace the India–US story and numbers with the Singapore data from Section 1, and add the credit line to the top of README.md. Do NOT rename contract files or deployed contract names. Run the existing tests and make sure they still pass.

**Prompt 3 — Hold rules (Section 3B)**
> Read SAFESEND.md Section 3B. Check ThunaiVault.sol against the three hold rules. If the cumulative (rolling period) limit is missing, add it with Foundry tests (use vm.warp). Do not break existing tests. Show me the forge test output.

**Prompt 4 — Warning screen (Section 3C)**
> Read SAFESEND.md Section 3C and 3G. Update the protected user's send and hold screens to show plain-language reasons, the safety tip, the "What is this payment for?" choice (sent to the guardian), and Cancel / Ask my guardian buttons. No crypto jargon on the main screen.

**Prompt 5 — Honest risk info (Section 3D)**
> Read SAFESEND.md Section 3D. Wherever risk reports are shown, display source, report date, verified/unverified status, and a "Request correction" link. Show "No reports found" instead of any "safe" label. Seed clearly labelled sample reports for the demo.

**Prompt 6 — Guardian review (Section 3E)**
> Read SAFESEND.md Section 3E. Rebuild the guardian's hold screen exactly in the listed order: amount/recipient, reasons + user's purpose, risk reports, the 3-question checklist, a Call button using the phone number saved at setup, the official-number warning, and Stop / Approve with the confirmation text. Approve and Stop must still use the existing passkey resolveHold flow.

**Prompt 7 — Demo check**
> Walk through the full demo on Monad testnet: Mdm Tan sends S$3,000 to a new address with a sample report → paused → plain warning → Wei Ming sees the checklist → taps Stop → money returns. Then a legitimate case that he approves. List anything that fails and fix it. Then write deployment notes in README.

**Prompt 8 (November) — AI guidance (Section 3F)**
> Read SAFESEND.md Section 3F. Add AI explanations and guardian question suggestions based on the user's stated purpose, with a non-AI fallback. AI must never affect hold decisions. Create docs/ai-evaluation.md with 10 scenarios (5 scam, 5 legitimate) and the results.

---

## 6. Demo script (for the video and Nov 26)

1. Problem (30s): S$410.6M lost in H1 2026; S$65.5M from crypto wallets; elderly lose most; crypto can't be reversed.
2. Setup (20s): guardian + saved phone number + limit.
3. Normal payment (20s): small payment to a saved recipient goes through.
4. Scam (60s): "bank officer" asks for S$3,000 → paused → plain reasons → user selects "Someone asked me to" → guardian sees checklist → calls → Stop → money back.
5. Guardian unavailable (20s): hold expires → money returns automatically.
6. Why better + impact (30s): Safe/Coinbase have the features; SafeSend makes them understandable for beginners and families.

---

## 7. Rules for the AI agent

- Never touch real funds. Testnet only.
- Keep the golden rule: contracts and authorised people decide; AI only explains.
- Don't rewrite working code — adapt it. Keep existing tests passing.
- Plain English in all user-facing text.
