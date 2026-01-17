# 📈 Schultz Stock Contest 2026

A high-performance, mobile-responsive leaderboard for the annual Schultz family stock-picking contest. This application uses a serverless architecture to provide real-time performance tracking while remaining strictly within free-tier API limits.

---

## 🚀 Features

- **Real-Time Leaderboard:** Dynamic calculation of gains, losses, and rankings.
- **Human-Proof Data Management:** Prizes and participants are managed via simple JSON files—no coding required for updates.
- **Integrated Prize Badges:** Winners (1st, 2nd, 3rd) and the "Last Place" consolation prize are highlighted directly on the leaderboard.
- **Server-Side Caching:** Optimized to share a single API fetch across all family members every 5 minutes.
- **Mobile-First Design:** Sleek Tailwind CSS interface that pivots from a desktop table to mobile data cards.

---

## 📂 Project Structure

```text
/
├── netlify/
│   └── functions/
│       └── get-prices.js    # Backend API proxy with 5m server-side caching
├── src/
│   ├── data/
│   │   ├── participants.json # The "Who": List of players and their picks
│   │   └── prizes.json       # The "What": Payout amounts and emojis
│   └── app.js                # Core Engine: Data fetching and UI rendering
├── index.html               # Semantic UI skeleton
├── package.json             # Backend dependencies (Axios)
└── netlify.toml             # Deployment configuration
```

---

## 👥 Participant Management (participants.json)
To update the players for a new season or fix an entry, edit src/data/participants.json.

Required Fields for Each Player:
name: The participant's display name.

stockName: Full name of the company (e.g., "NVIDIA Corp").

ticker: The stock symbol used for price lookups (e.g., "NVDA").

capital: The initial investment amount (e.g., 5000.00). Note: We use this explicit field to calculate the $80,000.00 baseline to avoid rounding errors.

cost: The purchase price per share at the start of the contest.

shares: The number of shares owned (capital divided by cost).

---

## 💰 Prize Management (prizes.json)
The contest payouts are entirely data-driven. To update the prize pool, edit src/data/prizes.json.

How it Works:
Keys "1", "2", "3": Represent the top three ranks.

Key "last": Represents the consolation prize for the bottom rank.

emoji: The icon displayed (e.g., 🥇, 💩, 🚀).

amount: The dollar value shown on the badge.

Pro Tip: By separating the emoji from the amount, the app handles all the spacing and styling automatically.

---

## 🛠️ Technical Architecture
Parallel Data Orchestration
The app uses Promise.all() to fetch participants.json and prizes.json simultaneously. This prevents "loading waterfalls" and ensures the UI renders only when all configuration data is ready.

API Rate Limit Protection (Finnhub)
Finnhub's free tier allows 60 calls per minute. With 16 tickers, a single refresh uses 27% of that limit. We protect the API via two layers:

Server-Side Cache: The Netlify Function (Node.js) stores stock prices in its global memory for 5 minutes.

Client Polling: app.js triggers an update every 5 minutes using setInterval.

Efficiency: This allows an unlimited number of family members to view the site simultaneously while only using 192 API calls per hour (5.3% of the total hourly allowance).

Precision Finance Logic
To prevent "penny drift" (where totals don't add up to $80,000.00 due to rounding), the app:

Uses the capital field for the investment total.

Enforces strict two-decimal formatting using the Intl.NumberFormat standard via a global CURRENCY_FORMAT constant.

---

## 🌍 Deployment
API Key: Get a free key from Finnhub.io.

Environment Variable: Add FINNHUB_KEY in the Netlify UI under Site settings > Environment variables.

Deploy: Any push to the main branch on GitHub will automatically trigger a production build.