/**
 * STONKS 2026 - DYNAMIC CORE ENGINE
 * Architecture: Flat Data (Resolved via Google Sheets formulas)
 */

const DATA_SOURCE = 'SHEETS'; 
const UPDATE_INTERVAL = 5 * 60 * 1000;
const CURRENCY_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

let currentPrizes = {};
let appConfig = {}; 

const PRIZE_STYLES = {
    0: "bg-amber-500/20 text-amber-500 border-amber-500/50",
    1: "bg-indigo-300/20 text-indigo-300 border-indigo-300/50",
    2: "bg-orange-600/20 text-orange-400 border-orange-600/50",
    "last": "bg-red-500/20 text-red-400 border-red-500/50"
};

/**
 * Data Fetcher: Robust header detection
 */
async function getGoogleSheetsData(id) {
    const fetchTab = async (tabName) => {
        try {
            const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}&cb=${Date.now()}`;
            const res = await fetch(url);
            const text = await res.text();
            const json = JSON.parse(text.substring(47).slice(0, -2));
            
            let rows = json.table.rows;
            let headers = json.table.cols.map(col => 
                col.label ? col.label.toLowerCase().replace(/[\s_]/g, '') : null
            );

            // Fallback for header detection
            const firstRowCells = rows[0]?.c || [];
            if (headers.every(h => !h || h.length <= 1) && firstRowCells.length > 0) {
                headers = firstRowCells.map(cell => 
                    cell && cell.v ? cell.v.toString().toLowerCase().replace(/[\s_]/g, '') : null
                );
                rows = rows.slice(1);
            }
            
            return rows.map(row => {
                const item = {};
                row.c.forEach((cell, i) => { 
                    if (headers[i]) {
                        item[headers[i]] = cell ? (cell.v !== undefined ? cell.v : cell.f) : null; 
                    }
                });
                return item;
            }).filter(obj => Object.keys(obj).length > 0 && Object.values(obj).some(v => v !== null));
        } catch (e) {
            console.warn(`Tab [${tabName}] failed to load.`);
            return [];
        }
    };

    // Parallel fetch of required tabs only
    const [contestants, records, rawPrizes, rawBenchmarks, rawConfig] = await Promise.all([
        fetchTab('Contestants'),
        fetchTab('Records'),
        fetchTab('Prizes'),
        fetchTab('Benchmarks'),
        fetchTab('Payment')
    ]);

    const prizes = { benchmarks: {} };
    rawPrizes.forEach(p => {
        const rank = p.rank?.toString().toLowerCase();
        if (rank) prizes[rank] = { emoji: p.emoji || '💰', amount: p.amount || '$0.00' };
    });

    rawBenchmarks.forEach(b => {
        const ticker = b.ticker ? b.ticker.toUpperCase() : null;
        if (ticker) prizes.benchmarks[ticker] = { name: b.name || ticker, startPrice: parseFloat(b.startprice) || 0 };
    });

    const config = {};
    rawConfig.forEach(row => {
        const key = row.key || row.item || Object.values(row)[0];
        const value = row.value || row.content || Object.values(row)[1];
        if (key) config[key] = value;
    });

    return { contestants, records, prizes, config };
}

/**
 * Main Application Logic
 */
const initApp = async () => {
    updateDynamicYear();
    updateMarketStatus();

    try {
        const configResponse = await fetch(`/.netlify/functions/get-prices?cb=${Date.now()}`); 
        const handshakeData = await configResponse.json();
        const sheetId = handshakeData.sheetId;

        const data = await getGoogleSheetsData(sheetId);
        currentPrizes = data.prizes;
        appConfig = { ...handshakeData.config, ...data.config };

        const payBtn = document.getElementById('payment-btn');
        if (payBtn) payBtn.innerText = appConfig.paymentButtonText || 'Pay Entry Fee';

        const winRecords = new Map();
        data.records.forEach(r => {
            const rId = r.useruuid || r.uuid;
            if (rId && r.place <= 3) {
                const count = winRecords.get(rId) || 0;
                winRecords.set(rId, count + 1);
            }
        });

        const benchmarkTickers = Object.keys(currentPrizes.benchmarks || {});
        const contestantTickers = data.contestants.map(c => c.ticker);
        const allTickers = [...new Set([...contestantTickers, ...benchmarkTickers])].join(',');

        const priceRes = await fetch(`/.netlify/functions/get-prices?tickers=${allTickers}&cb=${Date.now()}`);
        const { prices: livePrices } = await priceRes.json();

        updateBenchmarks(livePrices);
        
        const results = data.contestants.map(c => {
            const live = livePrices?.find(l => l.ticker === (c.ticker || '').toUpperCase());
            const currentPrice = live?.price || 0;
            const wins = winRecords.get(c.useruuid) || 0;

            return {
                ...c,
                name: c.name || "Anonymous",
                // legacy: wins > 0 ? `${wins}x Champ` : null,
                currentPrice,
                marketValue: (parseFloat(c.shares) || 0) * currentPrice,
                gainPct: parseFloat(c.cost) > 0 ? ((currentPrice - parseFloat(c.cost)) / parseFloat(c.cost)) * 100 : 0,
                dailyChange: live?.dp || 0,
                stockname: live?.name || 'Stock'
            };
        }).sort((a, b) => b.gainPct - a.gainPct);

        renderLeaderboard(results);
        updateStats(results);
        updateTopMover(results);

    } catch (err) {
        console.error("Critical System Failure:", err);
    }
};

/**
 * UI Rendering Functions
 */
function renderLeaderboard(results) {
    const container = document.getElementById('leaderboard-body');
    if (!container) return;
    
    container.innerHTML = results.map((res, index) => `
        <tr class="block md:table-row hover:bg-indigo-500/5 transition-all border-b border-indigo-500/10 md:border-none">
            <td class="px-8 py-4 block md:table-cell">
                <div class="flex items-center gap-4">
                    <span class="text-xs font-mono text-indigo-300/70 font-bold">#${index + 1}</span>
                    <div>
                        <div class="flex items-center gap-2">
                            <p class="font-black text-white text-base md:text-sm tracking-tight">${res.name}</p>
                            ${res.legacy ? `<span class="bg-amber-500/10 text-amber-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-tighter">${res.legacy}</span>` : ''}
                        </div>
                        ${getPrizeBadge(index, results.length)}
                    </div>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-center">
                <span class="text-indigo-300/70 text-[10px] uppercase font-black md:hidden pt-1">Stock</span>
                <div class="flex flex-col items-end md:items-center">
                    <span class="bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded text-[10px] font-black tracking-widest leading-none">${res.ticker}</span>
                    <span class="text-[9px] text-indigo-300/70 mt-2 font-bold uppercase tracking-widest truncate max-w-[100px]">${res.stockname}</span>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-center">
                <span class="text-indigo-300/70 text-[10px] uppercase font-black md:hidden pt-1">Investment</span>
                <div class="flex flex-col items-end md:items-center">
                    <span class="text-xs font-black text-white">$${(parseFloat(res.capital) || 0).toLocaleString(undefined, CURRENCY_FORMAT)}</span>
                    <span class="text-[9px] text-indigo-300/70 mt-2 font-bold uppercase tracking-widest truncate max-w-[100px]">${(parseFloat(res.shares) || 0).toFixed(3)} @ $${(parseFloat(res.cost) || 0).toFixed(2)}</span>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-center">
                <span class="text-indigo-300/70 text-[10px] uppercase font-black md:hidden pt-1">Value</span>
                <div class="flex flex-col items-end md:items-center">
                    <span class="text-xs font-black text-white">$${(res.marketValue || 0).toLocaleString(undefined, CURRENCY_FORMAT)}</span>
                    <span class="text-[9px] text-indigo-300/70 mt-2 font-bold uppercase tracking-widest truncate max-w-[100px]">$${(res.currentPrice || 0).toFixed(2)}</span>
                </div>
            </td>
            <td class="px-8 py-5 block md:table-cell text-left md:text-center">
                <span class="text-indigo-300/70 text-[10px] uppercase font-black md:hidden pt-1">% Return</span>
                <div class="flex flex-col items-end md:items-center">
                    <span class="text-lg md:text-sm font-black ${res.gainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}">${res.gainPct >= 0 ? '+' : ''}${res.gainPct.toFixed(2)}%</span>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateBenchmarks(livePrices) {
    const config = currentPrizes.benchmarks;
    const container = document.getElementById('benchmarks-container');
    if (!config || !container || !Array.isArray(livePrices)) return;

    container.innerHTML = Object.keys(config).map(ticker => {
        const live = livePrices.find(l => l.ticker === ticker);
        const start = config[ticker]?.startPrice;
        if (live && start) {
            const pct = ((live.price - start) / start) * 100;
            const isPos = pct >= 0;
            const color = isPos ? 'text-emerald-400' : 'text-red-400';
            const bg = isPos ? 'bg-emerald-500/50' : 'bg-red-500/50';
            
            return `
                <div class="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-3xl flex items-center gap-4 flex-1 min-w-[140px]">
                    <div class="${bg} p-2.5 rounded-xl text-xs font-black">${ticker}</div>
                    <div>
                        <p class="text-[9px] text-indigo-300/70 uppercase font-black tracking-widest">${config[ticker].name}</p>
                        <p class="text-sm font-bold ${color}">${isPos ? '+' : ''}${pct.toFixed(2)}%</p>
                    </div>
                </div>`;
        }
        return '';
    }).join('');
}

function updateStats(results) {
    const totalCap = results.reduce((s, r) => s + (parseFloat(r.capital) || 0), 0); 
    const totalVal = results.reduce((s, r) => s + (r.marketValue || 0), 0);
    const totalPct = totalCap > 0 ? ((totalVal - totalCap) / totalCap) * 100 : 0;
    
    const capEl = document.getElementById('stat-capital');
    const valEl = document.getElementById('stat-value');
    if (capEl) capEl.innerText = `$${totalCap.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    if (valEl) valEl.innerText = `$${totalVal.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    
    const gainEl = document.getElementById('stat-gain');
    if (gainEl) {
        gainEl.innerText = `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}%`;
        gainEl.className = `text-4xl md:text-2xl font-black ${totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
    }
    
    const updateEl = document.getElementById('last-updated');
    if (updateEl) updateEl.innerText = `SYNC: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function updateMarketStatus() {
    const now = new Date();
    const nyTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now);
    const hour = parseInt(nyTime);
    const isOpen = (now.getDay() !== 0 && now.getDay() !== 6) && hour >= 9 && hour < 16;
    
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (dot) dot.className = `h-2 w-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`;
    if (text) text.innerText = isOpen ? "Market Open" : "Market Closed";
}

function updateTopMover(results) {
    const top = [...results].sort((a, b) => b.dailyChange - a.dailyChange)[0];
    const el = document.getElementById('top-mover-name');
    if (top && el) el.innerText = `${top.name} (+${top.dailyChange.toFixed(2)}%)`;
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

window.triggerPayment = () => {
    if (appConfig.paymentUrl) window.location.href = appConfig.paymentUrl;
};

document.addEventListener('DOMContentLoaded', initApp);
setInterval(initApp, UPDATE_INTERVAL);