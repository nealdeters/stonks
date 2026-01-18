# 📈 Stonks

A high-performance, mobile-responsive leaderboard for an annual stock-picking contest. This application uses a serverless architecture to provide real-time performance tracking while remaining strictly within free-tier API limits.

---

## 🚀 Features

- **Dual-Source Data Engine:** Toggle between **Google Sheets** for live, no-code updates and **Local JSON** for versioned stability.
- **Real-Time Leaderboard:** Dynamic calculation of gains, losses, and rankings.
- **Integrated Prize Badges:** Winners (1st, 2nd, 3rd) and the "Last Place" consolation prize are highlighted directly on the leaderboard.
- **Server-Side Caching:** Optimized to share a single API fetch across all family members every 5 minutes.
- **Secure Configuration:** Sensitive data like Google Sheet IDs and API keys are stored in encrypted environment variables.

---

## 📂 Project Structure

```text
/
├── netlify/
│   └── functions/
│       └── get-prices.js    # Backend API proxy & secure ENV bridge
├── src/
│   ├── data/
│   │   ├── participants.json # Local Fallback: List of players/picks
│   │   └── prizes.json       # Local Fallback: Payouts & Benchmarks
│   └── app.js                # Core Engine: Dual-adapter data fetching
├── tests/
│   ├── backend.test.js       # Unit tests for Netlify functions
│   └── ui.test.js            # End-to-end UI tests with Puppeteer
├── index.html               # Semantic UI skeleton
├── style.css                # Custom styling
├── manifest.json            # PWA configuration
├── netlify.toml             # Deployment configuration
└── .env                     # Local secrets (SHEET_ID, FINNHUB_KEY)
```

---

## 👥 Data Management Options

The application supports two modes, controlled by the DATA_SOURCE constant in src/app.js.

### Option A: Google Sheets (Recommended for Live Contest)
Manage the entire contest without touching code. The app pulls from a Google Sheet acting as a live database.

1. Setup: Create a Google Sheet with three tabs: Participants, Prizes, and Benchmarks.
2. Permissions: Set the sheet to "Anyone with the link can view." (Note: Do NOT use "Publish to Web").
3. Connection: Add your SHEET_ID (the long string in the sheet's edit URL) to Netlify's environment variables.
4. Logic: The app uses the Google Visualization API (/gviz/tq) to fetch and parse data into the UI.

### Option B: Local JSON (Rollback/Archive Mode)
If Google Sheets is unavailable or you wish to "lock" a season's results, set DATA_SOURCE = 'LOCAL' in app.js.

- Participants (src/data/participants.json): Define name, ticker, capital, cost, and shares.
- Prizes (src/data/prizes.json): Define the emoji rewards and the startPrice for market benchmarks (SPY/QQQ).

---

## 📊 Prize & Benchmark Logic

Whether using Sheets or JSON, the logic follows these rules:

- Numeric Ranks ("1", "2", "3"): Automatically assigned to the top finishers based on total return %.
- Consolation ("last"): A special key assigned to the person at the very bottom of the leaderboard.
- Benchmarks: Compares family performance against market indices (SPY/QQQ).
  - startPrice: Set this to the market price at the exact moment the contest starts to ensure accurate % gain tracking.

---

## 🛠️ Technical Architecture

### The Secure Bridge
Since browsers cannot access process.env, the Netlify Function acts as a secure bridge. It retrieves the SHEET_ID from the server environment and passes it to the frontend alongside the price data, keeping your spreadsheet ID out of the public GitHub repository.

[Image of a sequence diagram showing a browser requesting data from a serverless function, which retrieves an environment variable and returns it to the client]

### Zero-Latency Batching
Benchmark tickers (SPY/QQQ) are batched with participant tickers in a single request to the Finnhub API. This provides market context with zero additional API overhead or loading delay.

### API Rate Limit Protection (Finnhub)
- Server-Side Cache: Stock prices are stored in global memory for 5 minutes.
- Client Polling: app.js refreshes every 5 minutes.
- Efficiency: This architecture uses only ~5% of the monthly free-tier allowance, regardless of how many family members are viewing the site.

---

## 🌍 Deployment & Local Dev

1. Environment Variables:
   - FINNHUB_KEY: Your API key from Finnhub.io.
   - SHEET_ID: The unique ID of your Google Sheet.
2. Local Development: Run "netlify dev" to sync your local environment with your cloud variables and test the Google Sheet integration locally.
3. Production: Any push to the main branch triggers an automatic build and deployment.