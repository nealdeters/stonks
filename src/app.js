/**
 * SCHULTZ STOCK GAME - CORE APPLICATION
 */

const CURRENCY_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 Minutes

const initApp = async () => {
    updateDynamicYear();
    const container = document.getElementById('leaderboard-body');
    if (!container) return;

    try {
        const response = await fetch('/src/data/participants.json');
        const participants = await response.json();

        const tickers = participants.map(p => p.ticker).join(',');
        const priceResponse = await fetch(`/.netlify/functions/get-prices?tickers=${tickers}`);
        const livePrices = await priceResponse.json();

        const results = participants.map(p => {
            const live = livePrices.find(l => l.ticker === p.ticker);
            const currentPrice = live?.price || 0;
            const marketValue = p.shares * currentPrice;
            const gainLoss = marketValue - p.capital; // Using clean capital field
            const gainPct = ((currentPrice - p.cost) / p.cost) * 100;
            return { ...p, currentPrice, marketValue, gainLoss, gainPct };
        }).sort((a, b) => b.gainPct - a.gainPct);

        renderLeaderboard(results);
        updateStats(results);
    } catch (err) {
        console.error("Dashboard Update Failed:", err);
    }
};

const renderLeaderboard = (results) => {
    const container = document.getElementById('leaderboard-body');
    
    container.innerHTML = results.map((res, index) => `
        <tr class="block md:table-row hover:bg-slate-700/20 transition-all">
            <td class="px-6 py-4 block md:table-cell">
                <div class="flex items-center gap-3">
                    <span class="text-xs font-mono text-slate-500">#${index + 1}</span>
                    <p class="font-bold text-white text-base md:text-sm">${res.name}</p>
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

            <td class="px-6 py-2 md:py-4 block md:table-cell text-left md:text-right border-t border-slate-700/30 md:border-none">
                <div class="flex justify-between md:block">
                    <span class="text-slate-500 text-[10px] uppercase font-bold md:hidden tracking-tighter">Investment</span>
                    <div>
                        <p class="text-xs font-medium text-slate-300">$${res.capital.toLocaleString(undefined, CURRENCY_FORMAT)}</p>
                        <p class="text-[10px] text-slate-500 italic">${res.shares.toFixed(3)} @ $${res.cost.toFixed(2)}</p>
                    </div>
                </div>
            </td>

            <td class="px-6 py-2 md:py-4 block md:table-cell text-left md:text-right">
                <div class="flex justify-between md:block">
                    <span class="text-slate-500 text-[10px] uppercase font-bold md:hidden tracking-tighter">Market</span>
                    <div>
                        <p class="text-xs font-bold text-white">$${res.marketValue.toLocaleString(undefined, CURRENCY_FORMAT)}</p>
                        <p class="text-[10px] text-slate-500 italic">Price: $${res.currentPrice.toFixed(2)}</p>
                    </div>
                </div>
            </td>

            <td class="px-6 py-4 block md:table-cell text-left md:text-right bg-slate-700/10 md:bg-transparent">
                <div class="flex justify-between md:block items-center">
                    <span class="text-slate-500 text-[10px] uppercase font-bold md:hidden tracking-tighter">Return</span>
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

const updateStats = (results) => {
    const totalCap = results.reduce((s, r) => s + r.capital, 0); 
    const totalVal = results.reduce((s, r) => s + r.marketValue, 0);
    const totalPct = ((totalVal - totalCap) / totalCap) * 100;

    document.getElementById('stat-capital').innerText = `$${totalCap.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    document.getElementById('stat-value').innerText = `$${totalVal.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    document.getElementById('stat-gain').innerText = `${totalPct.toFixed(2)}%`;
    document.getElementById('stat-gain').className = `text-xl font-bold ${totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
    document.getElementById('stat-leader').innerText = results[0].name;
    document.getElementById('last-updated').innerText = `Updated: ${new Date().toLocaleTimeString()}`;
};

const updateDynamicYear = () => {
    const year = new Date().getFullYear();
    document.querySelectorAll('.current-year').forEach(el => el.innerText = year);
};

// Initial Load
document.addEventListener('DOMContentLoaded', initApp);

// Setup Auto-Refresh (Polling) every 5 minutes
setInterval(initApp, UPDATE_INTERVAL);