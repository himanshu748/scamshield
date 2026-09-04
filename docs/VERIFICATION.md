# Verification record

Verified locally in fixture mode on 2026-09-04.

## Automated checks

- Backend: 13 tests passed.
- Backend lint: Ruff passed.
- Frontend: 8 interaction tests passed.
- Production frontend build: passed.
- Dependency audit: 0 npm vulnerabilities.
- Impeccable static design detector: 0 findings after the polish pass.

The frontend coverage includes the landing-to-demo path, scenario intake, the evidence-to-verdict trace, semantic table roles, explicit report approval, and persisted theme choice.

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
| 390 px viewport | no overflow; single-column investigation |
| 768 px viewport | no overflow; two-column evidence layout |
| 1440 px viewport | no overflow; three-column landing layout |
| Minimum button size | no button below 40 × 40 px |
| Semantic interactions | no clickable `div` elements; claim table has explicit headers and cells |
| Dark mode | rendered successfully with the approved result intact |
| Color and focus treatment | reviewed in both themes; no exact ratio is claimed without a checked-in measurement artifact |

The files in `docs/screenshots/` were captured from the running Vite application. The public landing page was captured at 1440 px and 390 px with one page-level heading, no browser console errors, and no horizontal overflow. The populated investigation captures use the local FastAPI fixture service; no claims, checks, source attribution, or safety actions are hidden at the smaller viewport.

Open Design was requested but its signed desktop runtime and local service were not installed on this machine, so no Open Design output is claimed. Claude Desktop later implemented the three landing-page passes within explicitly limited repository scope; Codex independently ran the tests, builds, responsive captures, and final claim audit documented here.
