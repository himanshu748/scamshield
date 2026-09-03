# Verification record

Verified locally on 2026-09-03 in fixture mode.

## Automated checks

- Backend: 11 tests passed.
- Backend lint: Ruff passed.
- Frontend: 3 interaction tests passed.
- Production frontend build: passed.
- Dependency audit: 0 npm vulnerabilities.
- Impeccable static design detector: 0 findings after the polish pass.

## Live workflow

1. Analyzed the fictional bank impersonation message.
2. Observed a high-risk result backed by three risky checks and one unknown check.
3. Confirmed that the URL appeared as evidence but was not a clickable link and no external request was made.
4. Confirmed phone data was masked in the source, sender claim and phone claim.
5. Confirmed the ordinary phrase `account will be suspended` was not over-redacted.
6. Reached the report control by keyboard and activated it with Enter.
7. Observed `Local report ready` only after approval.
8. Observed no browser console errors.

## UI checks

| Check | Result |
|---|---|
| 375 px viewport | no overflow; single-column investigation |
| 768 px viewport | no overflow; two-column evidence layout |
| 1280 px viewport | no overflow; three-column case layout |
| Minimum button size | no button below 40 × 40 px |
| Semantic interactions | no clickable `div` elements |
| Dark mode | rendered successfully with the approved result intact |
| Body contrast | 14.51:1 |
| Safety text contrast | 7.43:1 |
| Verdict contrast | 6.45:1 |
| Primary action contrast | 6.78:1 |

Open Design was requested but its signed desktop runtime and local service were not installed on this machine, so no Open Design output is claimed. Claude Code validation was also requested; the installed client could not authenticate because its OAuth session had expired, and no code was transmitted.
