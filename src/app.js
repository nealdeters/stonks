/**
 * STONKS - DYNAMIC CORE ENGINE
 */

const DATA_SOURCE = 'SHEETS'; 
const UPDATE_INTERVAL = 5 * 60 * 1000;
const CURRENCY_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

let currentPrizes = {};
let appConfig = {}; // Globally scoped for access

const PRIZE_STYLES = {
    0: "bg-amber-500/20 text-amber-500 border-amber-500/50",
    1: "bg-indigo-300/20 text-indigo-300 border-indigo-300/50",
    2: "bg-orange-600/20 text-orange-400 border-orange-600/50",
    "last": "bg-red-500/20 text-red-400 border-red-500/50"
};

/**
 * Robust Config Parser for Safari
 */
async function getGoogleSheetsData(id) {
    const fetchTab = async (tab) => {
        const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=${tab}&cb=${Date.now()}`;
        const res = await fetch(url);
        const text = await res.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        
        // Map column labels for easier reference
        const headers = json.table.cols.map(col => col.label.toLowerCase().replace(/\s/g, ''));
        
        return json.table.rows.map(row => {
            const item = {};
            row.c.forEach((cell, i) => { 
                if (headers[i]) item[headers[i]] = cell ? cell.v : null; 
            });
            return item;
        });
    };

    const [participants, rawPrizes, rawBenchmarks, rawConfig] = await Promise.all([
        fetchTab('Participants'),
        fetchTab('Prizes'),
        fetchTab('Benchmarks'),
        fetchTab('Config')
    ]);

    const prizes = { benchmarks: {} };
    rawPrizes.forEach(p => {
        if (p.rank !== null && p.rank !== undefined) {
            prizes[p.rank.toString().toLowerCase()] = { emoji: p.emoji || '💰', amount: p.amount || '$0.00' };
        }
    });

    rawBenchmarks.forEach(b => {
        if (b.ticker) {
            prizes.benchmarks[b.ticker.toUpperCase()] = { name: b.name || b.ticker, startPrice: b.startprice };
        }
    });

    // IMPROVED CONFIG PARSING: Handles different header names
    const config = {};
    rawConfig.forEach(row => {
        const key = row.key || row.item || Object.values(row)[0];
        const value = row.value || row.content || Object.values(row)[1];
        if (key) config[key] = value;
    });

    return { participants, prizes, config };
}

/**
 * Explicitly attached to window for Safari/iOS compatibility
 */
window.triggerPayment = function() {
    if (appConfig && appConfig.paymentUrl) {
        window.location.href = appConfig.paymentUrl;
    } else {
        alert("Payment details are still syncing from Google Sheets. Please wait 2 seconds and try again.");
    }
};

const initApp = async () => {
    updateDynamicYear();
    updateMarketStatus();

    try {
        const configResponse = await fetch(`/.netlify/functions/get-prices?cb=${Date.now()}`); 
        const handshakeData = await configResponse.json();
        const sheetId = handshakeData.sheetId;

        const data = await getGoogleSheetsData(sheetId);
        currentPrizes = data.prizes;
        
        // Merge handshake and sheet config
        appConfig = { ...handshakeData.config, ...data.config };

        // Update Button UI
        const payBtn = document.getElementById('payment-btn');
        if (payBtn) {
            payBtn.innerText = appConfig.paymentButtonText || 'Pay Entry Fee';
        }

        const benchmarkTickers = Object.keys(currentPrizes.benchmarks || {});
        const participantTickers = data.participants.map(p => p.ticker);
        const allTickers = [...new Set([...participantTickers, ...benchmarkTickers])].join(',');

        const priceRes = await fetch(`/.netlify/functions/get-prices?tickers=${allTickers}&cb=${Date.now()}`);
        const { prices: livePrices } = await priceRes.json();

        updateBenchmarks(livePrices);
        
        const results = data.participants.map(p => {
            const live = livePrices.find(l => l.ticker === p.ticker);
            const currentPrice = live?.price || 0;
            return {
                ...p,
                currentPrice,
                marketValue: p.shares * currentPrice,
                gainLoss: (p.shares * currentPrice) - p.capital,
                gainPct: p.cost > 0 ? ((currentPrice - p.cost) / p.cost) * 100 : 0,
                dailyChange: live?.dp || 0
            };
        }).sort((a, b) => b.gainPct - a.gainPct);

        renderLeaderboard(results);
        updateStats(results);
        updateTopMover(results);

    } catch (err) {
        console.error("Critical System Failure:", err);
    }
};

// ... keep existing renderLeaderboard, updateStats, updateMarketStatus, updateTopMover, getPrizeBadge, updateBenchmarks, updateDynamicYear ...
function renderLeaderboard(results) {
    const container = document.getElementById('leaderboard-body');
    if (!container) return;
    container.innerHTML = results.map((res, index) => `
        <tr class="block md:table-row hover:bg-indigo-500/5 transition-all border-b border-indigo-500/10 md:border-none">
            <td class="px-8 py-4 block md:table-cell">
                <div class="flex items-center gap-4">
                    <span class="text-xs font-mono text-indigo-500/50 font-bold">#${index + 1}</span>
                    <div>
                        <p class="font-black text-white text-base md:text-sm tracking-tight">${res.name}</p>
                        ${getPrizeBadge(index, results.length)}
                    </div>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-center border-t border-indigo-500/5 md:border-none">
                <div class="flex justify-between items-center md:flex-col md:gap-2">
                    <span class="text-indigo-300/30 text-[10px] uppercase font-black md:hidden">Stock</span>
                    <div class="flex flex-col items-end md:items-center">
                        <span class="bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded text-[10px] font-black tracking-widest leading-none">${res.ticker}</span>
                        <span class="text-[10px] text-indigo-300/30 mt-2 font-bold uppercase tracking-widest leading-none">${res.stockname || 'STOCKS'}</span>
                    </div>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-right border-t border-indigo-500/5 md:border-none">
                <div class="flex justify-between items-start md:block">
                    <span class="text-indigo-300/30 text-[10px] uppercase font-black md:hidden pt-1">Investment</span>
                    <div class="text-right">
                        <p class="text-xs font-bold text-indigo-200">$${res.capital.toLocaleString(undefined, CURRENCY_FORMAT)}</p>
                        <p class="text-[10px] text-indigo-300/30 font-mono mt-0.5">${res.shares.toFixed(3)} @ $${res.cost.toFixed(2)}</p>
                    </div>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-right border-t border-indigo-500/5 md:border-none">
                <div class="flex justify-between items-start md:block">
                    <span class="text-indigo-300/30 text-[10px] uppercase font-black md:hidden pt-1">Value</span>
                    <div class="text-right">
                        <p class="text-xs font-black text-white">$${res.marketValue.toLocaleString(undefined, CURRENCY_FORMAT)}</p>
                        <p class="text-[10px] text-indigo-300/30 font-mono mt-0.5">PRICE: $${res.currentPrice.toFixed(2)}</p>
                    </div>
                </div>
            </td>
            <td class="px-8 py-5 block md:table-cell text-left md:text-right bg-indigo-500/5 md:bg-transparent">
                <div class="flex justify-between items-center md:block">
                    <span class="text-indigo-300/30 text-[10px] uppercase font-black md:hidden">% Return</span>
                    <p class="text-lg md:text-sm font-black ${res.gainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                        ${res.gainPct >= 0 ? '+' : ''}${res.gainPct.toFixed(2)}%
                    </p>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateStats(results) {
    const totalCap = results.reduce((s, r) => s + r.capital, 0); 
    const totalVal = results.reduce((s, r) => s + r.marketValue, 0);
    const totalPct = totalCap > 0 ? ((totalVal - totalCap) / totalCap) * 100 : 0;
    
    const capEl = document.getElementById('stat-capital');
    const valEl = document.getElementById('stat-value');
    const gainEl = document.getElementById('stat-gain');
    
    if (capEl) capEl.innerText = `$${totalCap.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    if (valEl) valEl.innerText = `$${totalVal.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    
    if (gainEl) {
        gainEl.innerText = `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}%`;
        gainEl.className = `text-4xl md:text-2xl font-black ${totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
    }
    
    const leaderEl = document.getElementById('stat-leader');
    if (leaderEl) leaderEl.innerText = results[0]?.name || '--';

    const now = new Date();
    const updateEl = document.getElementById('last-updated');
    if (updateEl) updateEl.innerText = `SYNC: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

function updateMarketStatus() {
    const now = new Date();
    const nyTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now);
    const hour = parseInt(nyTime);
    const day = now.getDay();
    const isOpen = (day !== 0 && day !== 6) && hour >= 9 && hour < 16;
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (dot) dot.className = `h-2 w-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-ping' : (day === 0 || day === 6) ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`;
    if (text) text.innerText = isOpen ? "Market Open" : (day === 0 || day === 6) ? "Market Closed (Weekend)" : "Market Closed (After Hours)";
}

function updateTopMover(results) {
    const top = [...results].sort((a, b) => b.dailyChange - a.dailyChange)[0];
    const topMoverEl = document.getElementById('top-mover-name');
    if (top && topMoverEl) topMoverEl.innerText = `${top.name} (+${top.dailyChange.toFixed(2)}%)`;
}

function getPrizeBadge(index, totalCount) {
    const rankKey = (index + 1).toString();
    let prize = currentPrizes[rankKey];
    let style = PRIZE_STYLES[index];
    if (index === (totalCount - 1) && !prize && currentPrizes['last']) {
        prize = currentPrizes['last'];
        style = PRIZE_STYLES['last'];
    }
    return prize ? `<span class="mt-1.5 block w-fit px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter ${style}"><span class="mr-1">${prize.emoji}</span>${prize.amount}</span>` : '';
}

function updateBenchmarks(livePrices) {
    const config = currentPrizes.benchmarks;
    const container = document.getElementById('benchmarks-container');
    if (!config || !container) return;
    container.innerHTML = Object.keys(config).map(ticker => {
        const live = livePrices.find(l => l.ticker === ticker);
        const start = config[ticker]?.startPrice;
        if (live && start) {
            const pct = ((live.price - start) / start) * 100;
            const color = pct >= 0 ? 'text-emerald-400' : 'text-red-400';
            return `<div class="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-3xl flex-1 text-center min-w-[120px]"><p class="text-[9px] text-indigo-300/30 uppercase font-black mb-1">${config[ticker].name}</p><p class="text-sm font-bold ${color}">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</p></div>`;
        }
        return '';
    }).join('');
}

function updateDynamicYear() {
    document.querySelectorAll('.current-year').forEach(el => el.innerText = new Date().getFullYear());
}

document.addEventListener('DOMContentLoaded', initApp);
setInterval(initApp, UPDATE_INTERVAL);