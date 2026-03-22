# 📈 Stonks

A mobile-first leaderboard and automated management system for a stock-picking contest. This repo uses Netlify Functions for server-side tasks (data fetch, report emails, scheduled jobs) and a React frontend for the leaderboard UI.

---

## 🚀 Key Features

- Automated scheduled reports and contest finalization hooks
- Live data integration with Google Sheets for no-code updates
- Dynamic ranking and prize/badge assignment based on price data
- PWA installability and mobile-optimized UI

---

## 📂 Project Structure (high level)

```text
/
├── netlify/
│   ├── functions/        # Serverless endpoints and scheduled functions
│   └── lib/              # Shared function helpers (reports, stock-data, adapters)
├── src/                  # Frontend app (React components)
├── tests/                # Unit and integration tests
├── utils/                # Shared helpers used by frontend/tests
├── index.html
├── manifest.json
└── package.json
```

This mirrors the actual repository layout (see the `netlify/` and `src/` folders for function and UI code).

---

## 📊 Finalization & Reporting

- Finalization and scheduled work are implemented as Netlify scheduled functions (cron-style). The report generator captures a screenshot of the leaderboard and emails it via the configured email provider.
- Ad-hoc report runs can be triggered via the HTTP `manual-dispatch` function with a `task=report` and optional `to=` query parameter for single-recipient testing.

---

## 🛠️ Environment & Local Development

Required environment variables (subset):

- `FINNHUB_KEY` — market data API key
- `SHEET_ID` — Google Sheet ID
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` — Sheets API service account
- `APP_SECRET` — secret for protected manual dispatch
- `RESEND_API_KEY` — email sending API key

Local dev:

```
netlify dev
```

Run tests:

```
node --test tests/
```

---