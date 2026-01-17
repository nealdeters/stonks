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

## 📊 Contest & Benchmark Management (prizes.json)
This file controls the payouts and the indices shown in the header.

Prize Logic:
Keys "1", "2", "3": Map to the Top 3 ranks.

Key "last": Maps to the very bottom of the leaderboard.

emoji: The icon displayed (e.g., 🥇, 💩).

amount: The dollar value shown on the badge.

Benchmark Configuration:
The benchmarks compare the family's performance against the broader market.

startPrice: Critical. Set this to the closing price of SPY and QQQ on the first day of the contest.

Calculation: The app uses this to show the market's total return % since the contest began.

```
"benchmarks": {
  "SPY": { "name": "S&P 500", "startPrice": 595.60 },
  "QQQ": { "name": "Nasdaq", "startPrice": 510.40 }
}
```

---

## 🛠️ Technical Architecture
The app uses Promise.all() to fetch participants.json and prizes.json simultaneously. This prevents "loading waterfalls" and ensures the UI renders only when all configuration data is ready.

Zero-Latency Benchmarking
Benchmark tickers (SPY/QQQ) are appended to the participant ticker list and retrieved in a single batch request. This provides market context with zero additional API overhead.

API Rate Limit Protection (Finnhub)
To stay within the 60 calls per minute limit:

Server-Side Cache: The Netlify Function stores stock prices in global memory for 5 minutes.

Client Polling: app.js triggers an update every 5 minutes.

Efficiency: This architecture allows an unlimited number of viewers while using only 192 API calls per hour (5.3% of the free allowance).

Time-Zone Aware Logic
The Market Status indicator converts the user's local time to America/New_York (EST) to ensure the "Market Open" status is accurate regardless of where the family member is located.

---

## 🌍 Deployment
1. API Key: Get a free key from Finnhub.io.

2. Environment Variable: Add FINNHUB_KEY in Netlify under Site settings > Environment variables.

3. Deploy: Any push to the main branch on GitHub will trigger an automatic production build.