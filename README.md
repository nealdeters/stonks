# 📈 Schultz Stock Contest 2026

A high-performance, mobile-responsive leaderboard for the annual Schultz family stock picking contest. Built with a clean separation of concerns, serverless backend architecture, and global data caching.

## 🚀 Features

- **Real-Time Leaderboard:** Automatically calculates gains/losses based on live market data.
- **Server-Side Caching:** Optimized to stay within Finnhub's free API limits (60 calls/min) by sharing a single data fetch across all users every 5 minutes.
- **Responsive "Pivot" Design:** Seamlessly transitions from a professional desktop table to sleek mobile "data cards."
- **Automated Lifecycle:** Automatically updates the year and syncs data every 5 minutes without page refreshes.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Tailwind CSS (CDN), Vanilla JavaScript.
- **Backend:** Netlify Functions (Node.js).
- **API:** Finnhub Stock API.
- **Hosting:** Netlify (Automated CI/CD via GitHub).

---

## 📂 Project Structure

```text
/
├── netlify/
│   └── functions/
│       └── get-prices.js    # Backend API proxy with 5m caching
├── src/
│   ├── data/
│   │   └── participants.json # The "Source of Truth" for entries
│   └── app.js               # Frontend logic & rendering engine
├── index.html               # Semantic UI structure
├── package.json             # Backend dependencies (Axios)
└── netlify.toml             # Netlify deployment configuration