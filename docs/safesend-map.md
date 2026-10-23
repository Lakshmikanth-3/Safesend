# SafeSend map: what exists, what changed, what is left

Status as of 25 Oct 2026, after Phase 1 (mapping) and Phase 2 (sections A–E).

## 1. Requirements vs code

| Req | Item | Status | Where |
|---|---|---|---|
| A | Product name SafeSend in UI, titles, README | **Done** | `app/src/i18n/strings.ts`, `app/app.json`, `app/public/sw.js`, `app/app/onboard/*`, `README.md` |
| A | Roles: Protected user / Guardian | **Done** in user-facing copy | Route folders are still `student/` and `guardian/`, and the code still says `student` internally (see risks) |
| A | Backup guardian | **Added** | `setBackupGuardian` / `_consumeResolverAssertion` in `ThunaiVault.sol`, tests in `contracts/test/BackupGuardian.t.sol`, relayer `/backup/*`, app `app/app/onboard/backup.tsx` and `app/src/ui/GuardianSafetyCard.tsx` |
| A | Personas (Mdm Tan + Wei Ming, 16-year-old + parent) | **Done** in README and placeholders | `README.md`, `app/src/ui/SetupCard.tsx`, `app/app/onboard/accept.tsx` |
| A | Singapore data instead of India/US | **Done** | App, README, landing page (`frontend/`), agent alerts |
| A | Contract names kept | **Kept on purpose** | `ThunaiVault.sol`, `ScamSignals.sol`, `@thunai/*` packages |
| B1 | Reported recipient → hold | **Existed** | `ThunaiVault._holdReason` → `REASON_NETWORK_FLAG` (4), reads `ScamSignals.flagged` |
| B2 | First-time recipient → hold | **Existed** | Any payee not on the guardian-signed list → `REASON_NEW_PAYEE` (1) |
| B3 | Single payment over limit → hold | **Existed** | `Envelope.perWithdrawalCap` → `REASON_OVER_CAP` (2) |
| B3 | Rolling total over a period → hold | **Added** | `setSpendLimit`, `spentThisPeriod`, `REASON_OVER_PERIOD_LIMIT` (7); tests in `contracts/test/SpendLimit.t.sol` |
| C | Plain-language "why it was paused" list | **Added** | `app/src/safety.ts` `pauseReasons()`; shown in `app/app/student/send.tsx` (before sending) and `app/app/hold/[id].tsx` |
| C | Safety tip | **Added** | `SAFETY_TIP` in `app/src/safety.ts` |
| C | Cancel transfer / Ask my guardian to check | **Added** | Warning step in `send.tsx`. Cancel sends nothing. Ask sends it into a hold. |
| C | "What is this payment for?" passed to guardian | **Added** | Six choices in `send.tsx`; stored at the front of the payment note (`memoWithPurpose`); read back by `splitMemo` on the guardian screen |
| D | Source, date, verified/unverified, correction link | **Added** | `app/src/ui/RiskReports.tsx`, `riskReports()` in `app/src/safety.ts` |
| D | "No reports found", never "safe" | **Added** | `reportCountLabel()` |
| D | Labelled sample reports | **Added** | `SAMPLE_REPORTS` in `app/src/safety.ts` (any contact ending in `4567`) |
| D | Chainabuse | **Phase 3** | Check data access first |
| E | Guardian review in the specified order | **Added** | `app/app/hold/[id].tsx` (guardian branch) |
| E | Call button using the number saved at setup | **Added** | Guardian saves the number in `app/src/ui/SetupCard.tsx` (device only); hold screen uses `tel:` with only that number |
| E | Red Stop / green Approve with confirmation | **Added** | `StopButton` in `app/src/ui/components.tsx`; Approve stays disabled until "I have spoken to [name] and checked this request" is ticked; both still call the passkey `resolveHold` |
| F | AI guidance + evaluation | **Added** | `agent/src/classifier.ts` (Singapore scam types, uses the stated purpose, says what is uncertain, rule-based fallback); labelled on the guardian screen; `docs/ai-evaluation.md` from `agent/src/evaluate.ts`. The AI column needs an `ANTHROPIC_API_KEY`. |
| G | Base font ≥ 18, buttons ≥ 56, contrast | **Done** | `app/src/theme/index.ts` (body 18, small 16; `inkFaint` darkened to pass 4.5:1), buttons `minHeight: 56`, Stop 64 |
| G | Large text setting | **Added** | `SetupCard` on both home screens; scales text by 1.2 (`useScaled` in `components.tsx`) |
| G | No jargon on main screens | **Mostly** | Main screens cleaned. `details.tsx` and `network.tsx` still use technical terms, as intended for "Details". |

## 2. Commands

```bash
pnpm install                       # once, at the repo root
cp .env.example .env               # then fill in MONAD_RPC_URL and the three private keys

# contracts
cd contracts && forge test         # 116 tests (95 original + 11 rolling limit + 10 backup guardian)
cd .. && pnpm abi                  # copy the ABIs into packages/shared after a contract change
pnpm parity                        # TypeScript and Solidity agree on every challenge

# everything else
pnpm typecheck
pnpm -r test
pnpm e2e                           # the whole journey on a local Anvil chain, through the real relayer

# run it
pnpm dev                           # relayer :8787, agent :8788, app http://localhost:8081
```

## 3. Rename risks

- **Contract names (`ThunaiVault`, `ScamSignals`)**: renaming changes the ABI file names, the deploy script, the deployment JSON keys (`thunaiVault`) and the indexer config. Kept.
- **EIP-712 domain name `"Thunai"`** in `ThunaiVault._domainNameAndVersion`: changing it changes every signature digest. Kept.
- **Passkey challenge domains (`thunai.resolveHold`, ...)**: changing them breaks parity with the TypeScript side. Kept. The new one is `safesend.spendLimit`.
- **Package scope `@thunai/*`, the `useThunai` hook, the `thunai.device.v1` storage key**: internal only. Renaming the storage key would wipe every saved device. Kept.
- **Route folders `student/` and `guardian/`**: the role value `"student"` is stored on devices and sent to the relayer. Renaming needs a migration. Kept; only the words on screen changed.
- **App scheme / bundle id `thunai`**: changing it breaks existing installs and passkey associations. Kept.

## 4. Deployment (Monad testnet)

| Contract | Address |
|---|---|
| ThunaiVault (SafeSend, with rolling limit and backup guardian) | `0x9cFe6bC36F8C1aC0776a67957eB81CF0136681C9` |
| ScamSignals | `0xb51732F6b45878fe24853776B28c3D86fCc350De` |
| Stand-in CTK (tCTK) | `0x2ad2937e2354A17deA0d3B35390091887C83e134` |
| Stand-in AUSD (tAUSD) | `0x20CadD06815C0a4c261C61A0DE03c6ccD004923C` |

Earlier deployments are kept as `contracts/deployments/10143.companion-original.json` and `10143.safesend-v1.json` (rolling limit only). The relayer state for v1 is archived in `relayer/.data/*.safesend-v1.json`.

`pnpm e2e:testnet` passes the whole core journey on this vault. Its optional Chainlink CRE and ERC-8004 feedback checks fail because those Companion extras are not configured.

## 5. Still open

- External report source (Chainabuse): needs data access.
- AI column of the evaluation: needs an `ANTHROPIC_API_KEY`.
- Backup guardian restore after clearing a phone (re-invite works).
