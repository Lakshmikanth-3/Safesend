# Chainabuse as a report source: what we found

The mentor suggested checking whether Chainabuse's scam reports could be shown in SafeSend, and how its reports are checked.

## Access

| Question | Finding |
|---|---|
| Is there an API? | Yes. A "Get Report" lookup returns the reports linked to an address: description, scam category, indicators and amount lost. |
| How do you authenticate? | Basic Auth with an API key generated in the user's profile (Settings > API key). |
| Free limits | **10 calls per month** on a standard key (up to 50 reports per call); 5,000 calls per hour speed limit. |
| More usage | Partner access, requested through Chainabuse (hello@chainabuse.com). |
| Contributing reports | Partners can post reports in bulk (`/reports/batch`). |

Sources: [TRM Labs Chainabuse guide](https://docs.trmlabs.com/guides/chainabuse/getting-started), [informing product](https://docs.trmlabs.com/guides/chainabuse/informing-product), [error handling](https://docs.trmlabs.com/guides/chainabuse/error-handling).

## What this means for SafeSend

- **10 lookups a month is not enough** to check every new recipient for every family. A real integration needs partner access. We will request it during refinement.
- **Verification status:** the public documentation we found does not explain how Chainabuse marks a report as checked. Until that is confirmed, any Chainabuse report would be shown as **unverified**, with its source and date, next to SafeSend's own reports.
- **Recipients are phone numbers or emails in SafeSend**, which map to wallet addresses the relayer controls. Chainabuse lookups would apply when a user pays a raw wallet address, which the current app does not yet allow.
- **Two-way value:** with partner access, a guardian's stop-and-report could also be contributed back to Chainabuse, so warnings reach people outside SafeSend.

## Today

Reports shown in the app come only from SafeSend guardians who actually stopped a payment and reported it with their own Face ID, recorded on Monad. Each one is tied to a real stopped payment, so it is shown as verified.
