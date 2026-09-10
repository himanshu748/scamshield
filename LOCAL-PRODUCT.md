# Local product workflow

Verified 2026-09-07. This increment accepts your own inputs; sample scenarios remain optional. It is local-only, not a public multi-user release or a verified live AgentCore deployment.

## Start

Use the existing repository setup instructions to install dependencies. From the repository root, start the API in one terminal:

```sh
cd backend
SCAMSHIELD_FIXTURE_MODE=true .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```

In a second terminal:

```sh
cd frontend
npm run dev -- --config vite.config.ts --host 127.0.0.1 --port 5180 --strictPort
```

Open http://127.0.0.1:5180/. The frontend proxies /api to port 8002. The overview is available through Back to overview or /#overview.

## What works and what is limited

Paste an SMS, email or chat message. Sender confirmation is optional and must reflect your own independent check. Inspect the evidence, optionally generate/download a Markdown report, and reopen or delete saved cases.

Links are parsed, never opened. Domain ownership and sender names remain unverified unless you supply context. The risk score is a local rule-based heuristic, not a calibrated probability or a guarantee. No reputation service is queried. Redaction is incomplete: remove secrets before submitting. Cases are stored locally without user accounts; do not expose this API publicly.

Verified: custom message analysis, redacted persistence, saved-case reopening and report download in the browser; deletion covered by the API test. A copied Campus Library sender and domain correctly remained unknown. Backend: 29 tests; frontend: 16 tests; production build passed.

## Cost and data boundary

The commands above force local scripted model behavior. No AWS inference or deployment was started for these checks. The authorized ceiling is $50 in covered AWS credits and $0 from the bank; credit eligibility and billing safeguards have not been verified here. Do not switch off fixture mode or deploy based on this local validation.

Desktop light and mobile dark input screens were captured under .impeccable/review/. Browser downloads are under output/playwright/. No changes from this increment have been pushed to GitHub.
