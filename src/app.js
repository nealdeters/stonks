const CURRENCY_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const UPDATE_INTERVAL = 5 * 60 * 1000;
let currentPrizes = {}; 

const PRIZE_STYLES = {
    0: "bg-amber-500/20 text-amber-500 border-amber-500/50",
    1: "bg-slate-300/20 text-slate-300 border-slate-300/50",
    2: "bg-orange-600/20 text-orange-400 border-orange-600/50",
    "last": "bg-red-500/20 text-red-400 border-red-500/50"
};

const initApp = async () => {
    updateDynamicYear();
    updateMarketStatus();
    
    try {
        const [participantsRes, prizesRes] = await Promise.all([
            fetch('/src/data/participants.json'),
            fetch('/src/data/prizes.json')
        ]);

        const participants = await participantsRes.json();
        currentPrizes = await prizesRes.json();

        const tickers = [...participants.map(p => p.ticker), 'SPY', 'QQQ'].join(',');
        const priceResponse = await fetch(`/.netlify/functions/get-prices?tickers=${tickers}`);
        const livePrices = await priceResponse.json();

        updateBenchmarks(livePrices);

        const results = participants.map(p => {
            const live = livePrices.find(l => l.ticker === p.ticker);
            const currentPrice = live?.price || 0;
            return {
                ...p,
                currentPrice,
                marketValue: p.shares * currentPrice,
                gainLoss: (p.shares * currentPrice) - p.capital,
                gainPct: ((currentPrice - p.cost) / p.cost) * 100,
                dailyChange: live?.dp || 0
            };
        }).sort((a, b) => b.gainPct - a.gainPct);

        renderLeaderboard(results);
        updateStats(results);
        updateTopMover(results);

    } catch (err) {
        console.error("Dashboard Sync Failed:", err);
    }
};

function updateMarketStatus() {
    const now = new Date();
    const nyTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', hour: 'numeric', hour12: false
    }).format(now);
    
    const hour = parseInt(nyTime);
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    const isOpen = !isWeekend && hour >= 9 && hour < 16;

    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');

    if (isWeekend) {
        dot.className = "h-2 w-2 rounded-full bg-red-500";
        text.innerText = "Market Closed (Weekend)";
    } else if (!isOpen) {
        dot.className = "h-2 w-2 rounded-full bg-amber-500 animate-pulse";
        text.innerText = "Market Closed (After Hours)";
    } else {
        dot.className = "h-2 w-2 rounded-full bg-emerald-500 animate-ping";
        text.innerText = "Market Open (Trading Active)";
    }
}

function updateBenchmarks(livePrices) {
    const config = currentPrizes.benchmarks;
    if (!config) return;

    ['SPY', 'QQQ'].forEach(ticker => {
        const live = livePrices.find(l => l.ticker === ticker);
        const start = config[ticker].startPrice;
        if (live && start) {
            const pct = ((live.price - start) / start) * 100;
            const el = document.getElementById(`bench-${ticker.toLowerCase()}`);
            const color = pct >= 0 ? 'text-emerald-400' : 'text-red-400';
            el.innerHTML = `<span class="${color} font-black">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</span>
                            <span class="block text-[8px] text-slate-500 font-mono mt-1">$${live.price.toFixed(2)}</span>`;
        }
    });
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
                <div class="flex justify-between items-center md:flex-col">
                    <span class="text-slate-600 text-[10px] uppercase font-black md:hidden">Stock</span>
                    <div class="flex flex-col items-end md:items-center">
                        <span class="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded text-[10px] font-black tracking-widest">${res.ticker}</span>
                        <span class="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">${res.stockName || 'Stock'}</span>
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
                    <span class="text-slate-600 text-[10px] uppercase font-black md:hidden pt-1">Live Metrics</span>
                    <div class="text-right">
                        <p class="text-xs font-black text-white">$${res.marketValue.toLocaleString(undefined, CURRENCY_FORMAT)}</p>
                        <p class="text-[10px] text-slate-500 font-mono mt-0.5">PRICE: $${res.currentPrice.toFixed(2)}</p>
                    </div>
                </div>
            </td>
            <td class="px-8 py-5 block md:table-cell text-left md:text-right bg-slate-700/10 md:bg-transparent">
                <div class="flex justify-between items-center md:block">
                    <span class="text-slate-600 text-[10px] uppercase font-black md:hidden">Total Return</span>
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
    const totalPct = ((totalVal - totalCap) / totalCap) * 100;
    document.getElementById('stat-capital').innerText = `$${totalCap.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    document.getElementById('stat-value').innerText = `$${totalVal.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    const gainEl = document.getElementById('stat-gain');
    gainEl.innerText = `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}%`;
    gainEl.className = `text-4xl md:text-2xl font-black ${totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
    document.getElementById('stat-leader').innerText = results[0].name;
    const now = new Date();
    document.getElementById('last-updated').innerText = `SYNC: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

function updateTopMover(results) {
    const top = [...results].sort((a, b) => b.dailyChange - a.dailyChange)[0];
    document.getElementById('top-mover-name').innerText = `${top.name} (+${top.dailyChange.toFixed(2)}%)`;
}

function getPrizeBadge(index, totalCount) {
    const rankKey = (index + 1).toString();
    const prize = currentPrizes[rankKey] || (index === totalCount - 1 ? currentPrizes['last'] : null);
    const style = PRIZE_STYLES[index] || (index === totalCount - 1 ? PRIZE_STYLES['last'] : null);
    if (prize && style) {
        return `<span class="mt-1.5 block w-fit px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter ${style}">
                <span class="mr-1">${prize.emoji}</span>${prize.amount}</span>`;
    }
    return '';
}

function updateDynamicYear() {
    document.querySelectorAll('.current-year').forEach(el => el.innerText = new Date().getFullYear());
}

document.addEventListener('DOMContentLoaded', initApp);
setInterval(initApp, UPDATE_INTERVAL);