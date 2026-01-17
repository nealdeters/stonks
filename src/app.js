/**
 * SCHULTZ STOCK GAME - CORE ENGINE
 */

const CURRENCY_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 Minutes
let currentPrizes = {}; // Global store for prize data

// Visual styles for the prize badges
const PRIZE_STYLES = {
    0: "bg-amber-500/20 text-amber-500 border-amber-500/50", // 1st Place
    1: "bg-slate-300/20 text-slate-300 border-slate-300/50", // 2nd Place
    2: "bg-orange-600/20 text-orange-400 border-orange-600/50", // 3rd Place
    "last": "bg-red-500/20 text-red-400 border-red-500/50"     // Last Place
};

/**
 * Main Initialization Logic
 */
const initApp = async () => {
    updateDynamicYear();
    const container = document.getElementById('leaderboard-body');
    if (!container) return;

    try {
        // 1. Parallel Fetch: Pull both data sources at once
        const [participantsRes, prizesRes] = await Promise.all([
            fetch('/src/data/participants.json'),
            fetch('/src/data/prizes.json')
        ]);

        const participants = await participantsRes.json();
        currentPrizes = await prizesRes.json();

        // 2. Fetch Live Prices from Netlify Function
        const tickers = participants.map(p => p.ticker).join(',');
        const priceResponse = await fetch(`/.netlify/functions/get-prices?tickers=${tickers}`);
        const livePrices = await priceResponse.json();

        // 3. Process calculations
        const results = participants.map(p => {
            const live = livePrices.find(l => l.ticker === p.ticker);
            const currentPrice = live?.price || 0;
            const marketValue = p.shares * currentPrice;
            const gainLoss = marketValue - p.capital;
            const gainPct = live ? ((currentPrice - p.cost) / p.cost) * 100 : 0;
            return { ...p, currentPrice, marketValue, gainLoss, gainPct };
        }).sort((a, b) => b.gainPct - a.gainPct);

        renderLeaderboard(results);
        updateStats(results);
    } catch (err) {
        console.error("Dashboard Engine Failed:", err);
    }
};

/**
 * Helper: Maps human-friendly JSON keys to Badge UI
 */
function getPrizeBadge(index, totalCount) {
    let prizeData = null;
    let styleClass = null;

    const rankKey = (index + 1).toString(); // Map index 0 to key "1"
    
    if (currentPrizes[rankKey]) {
        prizeData = currentPrizes[rankKey];
        styleClass = PRIZE_STYLES[index];
    } else if (index === totalCount - 1 && currentPrizes['last']) {
        prizeData = currentPrizes['last'];
        styleClass = PRIZE_STYLES['last'];
    }

    if (prizeData && styleClass) {
        return `
            <span class="mt-1 block w-fit px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter ${styleClass}">
                <span class="mr-1">${prizeData.emoji}</span>${prizeData.amount}
            </span>`;
    }
    return '';
}

/**
 * UI Component: Main Leaderboard Table
 */
function renderLeaderboard(results) {
    const container = document.getElementById('leaderboard-body');
    container.innerHTML = results.map((res, index) => `
        <tr class="block md:table-row hover:bg-slate-700/20 transition-all border-b border-slate-700/30 md:border-none">
            <td class="px-6 py-4 block md:table-cell">
                <div class="flex items-center gap-3">
                    <span class="text-xs font-mono text-slate-500">#${index + 1}</span>
                    <div>
                        <p class="font-bold text-white text-base md:text-sm">${res.name}</p>
                        ${getPrizeBadge(index, results.length)}
                    </div>
                </div>
            </td>
            <td class="px-6 py-2 md:py-4 block md:table-cell text-left md:text-center">
                <div class="inline-flex flex-col md:items-center">
                    <span class="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-black tracking-widest leading-none">
                        ${res.ticker}
                    </span>
                    <span class="text-[10px] text-slate-400 mt-1.5 font-medium leading-tight">
                        ${res.stockName || 'Stock'}
                    </span>
                </div>
            </td>
            <td class="px-6 py-2 md:py-4 block md:table-cell text-left md:text-right">
                <div class="flex justify-between md:block">
                    <span class="text-slate-500 text-[10px] uppercase font-bold md:hidden">Investment</span>
                    <div>
                        <p class="text-xs font-medium text-slate-300">$${res.capital.toLocaleString(undefined, CURRENCY_FORMAT)}</p>
                        <p class="text-[10px] text-slate-500 italic">${res.shares.toFixed(3)} @ $${res.cost.toFixed(2)}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-2 md:py-4 block md:table-cell text-left md:text-right">
                <div class="flex justify-between md:block">
                    <span class="text-slate-500 text-[10px] uppercase font-bold md:hidden tracking-tighter text-right w-full">Value</span>
                    <div class="text-right md:text-right">
                        <p class="text-xs font-bold text-white">$${res.marketValue.toLocaleString(undefined, CURRENCY_FORMAT)}</p>
                        <p class="text-[10px] text-slate-500 italic">Price: $${res.currentPrice.toFixed(2)}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 block md:table-cell text-left md:text-right bg-slate-700/10 md:bg-transparent">
                <div class="flex justify-between md:block items-center">
                    <span class="text-slate-500 text-[10px] uppercase font-bold md:hidden">Return</span>
                    <div class="text-right">
                        <p class="text-lg md:text-sm font-black ${res.gainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                            ${res.gainPct >= 0 ? '+' : ''}${res.gainPct.toFixed(2)}%
                        </p>
                        <p class="text-[10px] font-bold ${res.gainPct >= 0 ? 'text-emerald-600' : 'text-red-600'}">
                            ${res.gainLoss >= 0 ? '+' : '-'}$${Math.abs(res.gainLoss).toLocaleString(undefined, CURRENCY_FORMAT)}
                        </p>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * UI Component: Top Stats Bar
 */
function updateStats(results) {
    const totalCap = results.reduce((s, r) => s + r.capital, 0); 
    const totalVal = results.reduce((s, r) => s + r.marketValue, 0);
    const totalPct = ((totalVal - totalCap) / totalCap) * 100;

    document.getElementById('stat-capital').innerText = `$${totalCap.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    document.getElementById('stat-value').innerText = `$${totalVal.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    
    const gainEl = document.getElementById('stat-gain');
    gainEl.innerText = `${totalPct.toFixed(2)}%`;
    gainEl.className = `text-xl font-bold ${totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
    
    document.getElementById('stat-leader').innerText = results[0].name;

    const now = new Date();
    document.getElementById('last-updated').innerText = `As of ${now.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function updateDynamicYear() {
    const year = new Date().getFullYear();
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
}

// App Lifecycle
document.addEventListener('DOMContentLoaded', initApp);
setInterval(initApp, UPDATE_INTERVAL);