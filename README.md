# 📈 Stonks

A high-performance, mobile-responsive leaderboard and automated management system for an annual stock-picking contest. This application uses a serverless architecture to provide real-time performance tracking and automated end-of-contest transitions.

---

## 🚀 Key Features

* **Automated Contest Reset:** A GitHub Actions-driven finalization engine that snapshots final standings, archives them to a "Records" hall of fame, and resets the board for the next contest.
* **Dual-Source Data Engine:** Seamless integration with Google Sheets for live, no-code updates, with calculated fallbacks for offline stability.
* **Smart Ranking & Prize Logic:** Dynamic calculation of gains, losses, and rankings using real-time Finnhub price data. Includes automated badge assignment for 1st, 2nd, 3rd, and the "Last Place" consolation.
* **Career Analytics:** Deep-link participant profiles that aggregate historical performance data from the Records tab to calculate career "Medal Counts" and average returns.
* **Server-Side Caching:** Netlify Functions optimize API usage by sharing a single 5-minute price cache across all concurrent users.
* **PWA Ready:** Installable on iOS/Android with custom icons and manifest support for a native-app feel.

---

## 📂 Project Structure

```text
/
├── .github/
│   └── workflows/
│       ├── finalize.yml     # Weekly check to archive & reset contest
│       └── main.yml         # CI/CD & Automated test suite
├── netlify/
│   └── functions/
│       └── fetch-data.js    # Secure API proxy & Finnhub cache
├── scripts/
│   └── finalize.js          # Contest reset & archiving logic
├── src/
│   ├── utils/
│   │   └── helpers.js       # Shared date, parsing, and range logic
│   └── app.js               # Frontend orchestration & UI rendering
├── tests/
│   ├── helpers/
│   │   └── browser.js       # Centralized Puppeteer CI/CD config
│   ├── finalize.test.js     # Unit tests for reset logic
│   └── stats.ui.test.js     # Career stats rendering tests
├── index.html               # Main Dashboard (PWA entry)
├── manifest.json            # Web App Manifest
└── .env                     # Local secrets (SHEET_ID, FINNHUB_KEY, GOOGLE_KEY)
```

---

## 📊 The "Finalization" Workflow

The app is designed to be "Set it and Forget it." Every Monday morning, a GitHub Action runs \`scripts/finalize.js\`:

1.  **Date Check:** It compares today's date against the \`end\` date in your Google Sheets 'Controls' tab.
2.  **Archival:** If the contest is over, it fetches final prices, calculates the definitive 'Place' for every player, and appends the 10-column result to the 'Records' tab.
3.  **Reset:** It clears the 'Contestants' tab (preserving headers) to prepare for next year’s entries.
4.  **Automation:** The 'Winners' page automatically updates its podium based on the new data in 'Records'.

---

## 🛠️ Technical Architecture

### Secure Environment Bridge
Since browser-side API calls expose keys, the Netlify Function acts as the gatekeeper. It retrieves \`GOOGLE_PRIVATE_KEY\` and \`FINNHUB_KEY\` from the server environment, keeping your credentials hidden from the public.

### Zero-Sandbox CI Testing
To ensure stability on Ubuntu-based GitHub Runners, the test suite utilizes a centralized Puppeteer helper configured with \`--no-sandbox\` and \`--disable-setuid-sandbox\` flags, ensuring UI tests pass in restricted cloud environments.

---

## 🌍 Deployment & Local Dev

### 1. Environment Variables
* **FINNHUB_KEY:** API key for market data.
* **SHEET_ID:** The ID from your Google Sheet URL.
* **GOOGLE_SERVICE_ACCOUNT_EMAIL:** The email of your GCP Service Account.
* **GOOGLE_PRIVATE_KEY:** The RSA private key for Sheets API access.
* **UPSTASH_REDIS_REST_URL:** The redis url for your redis cluster.
* **UPSTASH_REDIS_REST_TOKEN:** The redis private token for your redis cluster.
* **APP_SECRET:** The application secret to allow contestant entries.
* **RESEND_API_KEY:** The api key for email notifications.

### 2. Local Development
Run \`netlify dev\` to test the full stack, including functions and environment variables.

### 3. Testing
Run \`node --test tests/\` to execute the full suite of unit and UI integration tests.