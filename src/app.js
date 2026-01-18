/**
 * STONKS - DYNAMIC CORE ENGINE
 */

// --- GLOBAL CONFIG ---
const DATA_SOURCE = 'SHEETS'; 
const UPDATE_INTERVAL = 5 * 60 * 1000;
const CURRENCY_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

let currentPrizes = {};

const PRIZE_STYLES = {
    0: "bg-amber-500/20 text-amber-500 border-amber-500/50",
    1: "bg-slate-300/20 text-slate-300 border-slate-300/50",
    2: "bg-orange-600/20 text-orange-400 border-orange-600/50",
    "last": "bg-red-500/20 text-red-400 border-red-500/50"
};

/**
 * ADAPTER 1: Google Sheets Source
 */
async function getGoogleSheetsData(id) {
    const fetchTab = async (tab) => {
        const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=${tab}&t=${Date.now()}`;
        const res = await fetch(url);
        const text = await res.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        
        // Normalize headers to lowercase and remove spaces
        const headers = json.table.cols.map(col => col.label.toLowerCase().replace(/\s/g, ''));
        
        return json.table.rows.map(row => {
            const item = {};
            row.c.forEach((cell, i) => { 
                if (headers[i]) item[headers[i]] = cell ? cell.v : null; 
            });
            return item;
        });
    };

    const [participants, rawPrizes, rawBenchmarks] = await Promise.all([
        fetchTab('Participants'),
        fetchTab('Prizes'),
        fetchTab('Benchmarks')
    ]);

    const prizes = { benchmarks: {} };

    // Map Prizes
    rawPrizes.forEach(p => {
        if (p.rank !== null && p.rank !== undefined) {
            prizes[p.rank.toString().toLowerCase()] = { 
                emoji: p.emoji || '💰', 
                amount: p.amount || '$0.00' 
            };
        }
    });

    // Map Benchmarks: Uses 'startprice' from Sheet header normalization
    rawBenchmarks.forEach(b => {
        if (b.ticker) {
            prizes.benchmarks[b.ticker.toUpperCase()] = { 
                name: b.name || b.ticker, 
                startPrice: b.startprice 
            };
        }
    });

    return { participants, prizes };
}

/**
 * ADAPTER 2: Local JSON Source (Rollback)
 */
async function getLocalData() {
    const [pRes, prizeRes] = await Promise.all([
        fetch('/src/data/participants.json'),
        fetch('/src/data/prizes.json')
    ]);
    return { participants: await pRes.json(), prizes: await prizeRes.json() };
}

const initApp = async () => {
    updateDynamicYear();
    updateMarketStatus();

    try {
        // STEP 1: Handshake for ID
        const configResponse = await fetch('/.netlify/functions/get-prices'); 
        const { sheetId } = await configResponse.json();

        if (!sheetId && DATA_SOURCE === 'SHEETS') throw new Error("SHEET_ID not found.");

        // STEP 2: Fetch Contest Data
        const data = (DATA_SOURCE === 'SHEETS') 
            ? await getGoogleSheetsData(sheetId) 
            : await getLocalData();

        currentPrizes = data.prizes;

        // STEP 3: Dynamic Ticker Aggregation
        const benchmarkTickers = Object.keys(currentPrizes.benchmarks || {});
        const participantTickers = data.participants.map(p => p.ticker);
        const allTickers = [...new Set([...participantTickers, ...benchmarkTickers])].join(',');

        const priceRes = await fetch(`/.netlify/functions/get-prices?tickers=${allTickers}`);
        const { prices: livePrices } = await priceRes.json();

        // STEP 4: Render Components
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
            return `
                <div class="bg-slate-800/40 border border-slate-700/50 p-4 rounded-3xl flex-1 text-center min-w-[120px]">
                    <p class="text-[9px] text-slate-500 uppercase font-black mb-1">${config[ticker].name}</p>
                    <p class="text-sm font-bold ${color}">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</p>
                </div>
            `;
        }
        return '';
    }).join('');
}

function renderLeaderboard(results) {
    const container = document.getElementById('leaderboard-body');
    container.innerHTML = results.map((res, index) => `
        <tr class="block md:table-row hover:bg-slate-700/20 transition-all border-b border-slate-700/30 md:border-none">
            <td class="px-8 py-4 block md:table-cell">
                <div class="flex items-center gap-4">
                    <span class="text-xs font-mono text-slate-600 font-bold">#${index + 1}</span>
                    <div>
                        <p class="font-black text-white text-base md:text-sm tracking-tight">${res.name}</p>
                        ${getPrizeBadge(index, results.length)}
                    </div>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-center border-t border-slate-700/10 md:border-none">
                <div class="flex justify-between items-center md:flex-col md:gap-2">
                    <span class="text-slate-600 text-[10px] uppercase font-black md:hidden">Stock</span>
                    <div class="flex flex-col items-end md:items-center">
                        <span class="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded text-[10px] font-black tracking-widest leading-none">${res.ticker}</span>
                        <span class="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest leading-none">${res.stockname || 'STOCKS'}</span>
                    </div>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-right border-t border-slate-700/10 md:border-none">
                <div class="flex justify-between items-start md:block">
                    <span class="text-slate-600 text-[10px] uppercase font-black md:hidden pt-1">Investment</span>
                    <div class="text-right">
                        <p class="text-xs font-bold text-slate-300">$${res.capital.toLocaleString(undefined, CURRENCY_FORMAT)}</p>
                        <p class="text-[10px] text-slate-500 font-mono mt-0.5">${res.shares.toFixed(3)} @ $${res.cost.toFixed(2)}</p>
                    </div>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-right border-t border-slate-700/10 md:border-none">
                <div class="flex justify-between items-start md:block">
                    <span class="text-slate-600 text-[10px] uppercase font-black md:hidden pt-1">Value</span>
                    <div class="text-right">
                        <p class="text-xs font-black text-white">$${res.marketValue.toLocaleString(undefined, CURRENCY_FORMAT)}</p>
                        <p class="text-[10px] text-slate-500 font-mono mt-0.5">PRICE: $${res.currentPrice.toFixed(2)}</p>
                    </div>
                </div>
            </td>
            <td class="px-8 py-5 block md:table-cell text-left md:text-right bg-slate-700/10 md:bg-transparent">
                <div class="flex justify-between items-center md:block">
                    <span class="text-slate-600 text-[10px] uppercase font-black md:hidden">% Return</span>
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

    document.getElementById('stat-capital').innerText = `$${totalCap.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    document.getElementById('stat-value').innerText = `$${totalVal.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    
    const gainEl = document.getElementById('stat-gain');
    gainEl.innerText = `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}%`;
    gainEl.className = `text-4xl md:text-2xl font-black ${totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
    
    document.getElementById('stat-leader').innerText = results[0]?.name || '--';
    const now = new Date();
    document.getElementById('last-updated').innerText = `SYNC: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

function updateMarketStatus() {
    const now = new Date();
    const nyTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now);
    const hour = parseInt(nyTime);
    const day = now.getDay();
    const isOpen = (day !== 0 && day !== 6) && hour >= 9 && hour < 16;
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    dot.className = `h-2 w-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-ping' : (day === 0 || day === 6) ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`;
    text.innerText = isOpen ? "Market Open" : (day === 0 || day === 6) ? "Market Closed (Weekend)" : "Market Closed (After Hours)";
}

function updateTopMover(results) {
    const top = [...results].sort((a, b) => b.dailyChange - a.dailyChange)[0];
    if (top) {
        document.getElementById('top-mover-name').innerText = `${top.name} (+${top.dailyChange.toFixed(2)}%)`;
    }
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

function updateDynamicYear() {
    document.querySelectorAll('.current-year').forEach(el => el.innerText = new Date().getFullYear());
}

document.addEventListener('DOMContentLoaded', initApp);
setInterval(initApp, UPDATE_INTERVAL);