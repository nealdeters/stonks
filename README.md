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
- Report email **From** is controlled by `RESEND_FROM`. Verify each sending domain in Resend, then set `RESEND_FROM` on **each** Netlify site (schultzcup / stonkscup). If unset, the code falls back to testing-only `reports@resend.dev`, which only delivers to the account owner and will fail (e.g. 403) for multi-recipient contestant lists.

---

## 🛠️ Environment & Local Development

Required environment variables (subset):

- `FINNHUB_KEY` — market data API key
- `SHEET_ID` — Google Sheet ID
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` — Sheets API service account
- `APP_SECRET` — secret for protected manual dispatch
- `RESEND_API_KEY` — email sending API key
- `RESEND_FROM` — production From address (full `Display Name <email@domain>` **or** just `email@domain`). Recommended:
  - schultzcup: `Schultz Cup Report <reports@schultzcup.com>`
  - stonkscup: `Stonks Cup Report <reports@stonkscup.com>`
  - If unset: testing-only fallback `${title} Report <reports@resend.dev>` (not for multi-recipient production sends)

Local dev:

```
netlify dev
```

Run tests:

```
node --test tests/
```

---