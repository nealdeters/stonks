/**
 * STONKS 2026 - PRIVATE API FRONTEND
 * Core Engine: Secure Data Integration
 */
const UPDATE_INTERVAL = 5 * 60 * 1000;
const CURRENCY_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

let currentPrizes = {};

const PRIZE_STYLES = {
    0: "bg-amber-500/20 text-amber-500 border-amber-500/50",
    1: "bg-indigo-300/20 text-indigo-300 border-indigo-300/50",
    2: "bg-orange-600/20 text-orange-400 border-orange-600/50",
    "last": "bg-red-500/20 text-red-400 border-red-500/50"
};

const initApp = async () => {
    updateMarketStatus();

    try {
        const response = await fetch(`/.netlify/functions/fetch-data?cb=${Date.now()}`);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || "Network response was not ok");
        }
        
        const data = await response.json();
        const { sheetData, prices } = data;

        currentPrizes = { benchmarks: {} };
        sheetData.prizes.forEach(p => {
            const rank = p.rank?.toString().toLowerCase();
            if (rank) {                
                let emoji = p.emoji;
                currentPrizes[rank] = { emoji: emoji || '💰', amount: p.amount || '$0.00' };
            }
        });

        // 1. Process Benchmarks
        sheetData.benchmarks.forEach(b => {
            if (b.ticker) {
                currentPrizes.benchmarks[b.ticker.toUpperCase()] = { 
                    name: b.name || b.ticker, 
                    price: parseFloat(b.price) 
                };
            }
        });

        // 2. Link Results & Calculate Performance
        const results = sheetData.contestants.map(c => {
            const live = prices.find(p => p.ticker === (c.ticker || '').toUpperCase());
            const currentPrice = live?.price || 0;
            const cost = parseFloat(c.cost) || 0;
            const shares = parseFloat(c.shares) || 0;

            return {
                ...c,
                name: c.name || "Anonymous",
                currentPrice,
                marketValue: shares * currentPrice,
                gainPct: cost > 0 ? ((currentPrice - cost) / cost) * 100 : 0,
                dailyChange: live?.dp || 0,
                stockname: live?.name || 'Stock'
            };
        }).sort((a, b) => b.gainPct - a.gainPct);

        // 3. Render UI Components
        renderLeaderboard(results);
        updateStats(results);
        updateBenchmarks(prices);
        updateTopMover(results);

        // 4. Update Payment Button (Using the new 'controls' object)
        const controls = sheetData.controls;
        console.log({ controls })
        if (controls?.payment_url) {
            const payBtn = document.getElementById('payment-btn');
            payBtn.innerText = controls.payment_text || 'Pay Entry Fee';
            window.payment_url = controls.payment_url;
        }

        // 5. Handle Registration Cutoff (Using the new 'controls' object)
        if (controls?.cutoff) {
            const now = new Date();
            const regCutoff = new Date(controls.cutoff);
            const addBtn = document.getElementById('add-participant-btn');

            if (now > regCutoff && addBtn) {
                addBtn.disabled = true;
                addBtn.innerText = "Registration Closed";
                addBtn.classList.add('opacity-50', 'cursor-not-allowed');
                addBtn.onclick = null;
            }
        }

        if (controls?.title) {
            // Update the Browser Tab Title
            document.title = controls.title;

            // Update the Header H1
            const mainTitleEl = document.querySelector('header h1');
            if (mainTitleEl) {
                mainTitleEl.innerText = controls.title;
            }
        }
    } catch (err) {
        console.error("Critical System Failure:", err);
    }
};

/** * UI Rendering Functions 
 */
function renderLeaderboard(results) {
    const container = document.getElementById('leaderboard-body');
    if (!container) return;
    
    container.innerHTML = results.map((res, index) => `
        <tr class="block md:table-row hover:bg-indigo-500/10 transition-all border-b border-indigo-500/20 md:border-none">
            <td class="px-8 py-4 block md:table-cell">
                <div class="flex items-center gap-4">
                    <span class="text-xs font-mono text-indigo-400 font-bold">#${index + 1}</span>
                    <div>
                        <div class="flex items-center gap-2">
                            <p class="font-black text-white text-base md:text-sm tracking-tight">${res.name}</p>
                            ${res.legacy ? `<span class="bg-amber-500/20 text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-500/40 uppercase tracking-tighter">${res.legacy}</span>` : ''}
                        </div>
                        ${getPrizeBadge(index, results.length)}
                    </div>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-center">
                <span class="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">Stock</span>
                <div class="flex flex-col items-end md:items-center">
                    <span class="bg-indigo-500/20 text-indigo-200 px-2.5 py-1 rounded text-[10px] font-black tracking-widest leading-none border border-indigo-500/30">${res.ticker}</span>
                    <span class="text-[9px] text-slate-300 mt-2 font-bold uppercase tracking-widest truncate max-w-[100px]">${res.stockname}</span>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-right">
                <span class="text-slate-400 text-[10px] uppercase font-black md:hidden">Investment</span>
                <div class="flex flex-col items-end">
                    <p class="text-xs font-bold text-white">$${(parseFloat(res.capital) || 0).toLocaleString(undefined, CURRENCY_FORMAT)}</p>
                    <p class="text-[10px] text-slate-400 font-mono">${(parseFloat(res.shares) || 0).toFixed(3)} @ $${(parseFloat(res.cost) || 0).toFixed(2)}</p>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-right">
                <span class="text-slate-400 text-[10px] uppercase font-black md:hidden">Value</span>
                <div class="flex flex-col items-end">
                    <p class="text-xs font-black text-white">$${(res.marketValue || 0).toLocaleString(undefined, CURRENCY_FORMAT)}</p>
                    <p class="text-[10px] text-slate-400 font-mono">$${(res.currentPrice || 0).toFixed(2)}</p>
                </div>
            </td>
            <td class="px-8 py-5 block md:table-cell text-left md:text-right">
                <span class="text-slate-400 text-[10px] uppercase font-black md:hidden">% Return</span>
                <div class="flex flex-col items-end">
                    <p class="text-lg md:text-sm font-black ${res.gainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                        ${res.gainPct >= 0 ? '+' : ''}${res.gainPct.toFixed(2)}%
                    </p>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateBenchmarks(livePrices) {
    const config = currentPrizes.benchmarks;
    const container = document.getElementById('benchmarks-container');
    if (!config || !container) return;

    container.innerHTML = Object.keys(config).map(ticker => {
        const live = livePrices.find(l => l.ticker === ticker);
        const start = config[ticker]?.price;
        if (live && start) {
            const pct = ((live.price - start) / start) * 100;
            const isPos = pct >= 0;
            return `
                <div class="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-3xl flex items-center gap-4 flex-1 min-w-[140px]">
                    <div class="${isPos ? 'bg-emerald-500/20' : 'bg-red-500/20'} p-2.5 rounded-xl text-xs font-black">${ticker}</div>
                    <div>
                        <p class="text-[9px] text-indigo-300/70 uppercase font-black tracking-widest">${config[ticker].name}</p>
                        <p class="text-sm font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'}">${isPos ? '+' : ''}${pct.toFixed(2)}%</p>
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
    
    document.getElementById('stat-capital').innerText = `$${totalCap.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    document.getElementById('stat-value').innerText = `$${totalVal.toLocaleString(undefined, CURRENCY_FORMAT)}`;
    
    const gainEl = document.getElementById('stat-gain');
    if (gainEl) {
        gainEl.innerText = `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}%`;
        gainEl.className = `text-4xl md:text-2xl font-black ${totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
    }
    
    document.getElementById('last-updated').innerText = `SYNC: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function updateMarketStatus() {
    const now = new Date();
    const nyTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now);
    const hour = parseInt(nyTime);
    const day = now.getDay();
    const isOpen = (day !== 0 && day !== 6) && hour >= 9 && hour < 16;
    
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
    if (index === (totalCount - 1) && !prize && currentPrizes['last']) prize = currentPrizes['last'];
    
    if (prize) {
        const style = PRIZE_STYLES[index] || PRIZE_STYLES['last'];
        return `<span class="mt-1.5 block w-fit px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter ${style}"><span class="mr-1">${prize.emoji}</span>${prize.amount}</span>`;
    }
    return '';
}

// Global Event Listeners
window.triggerPayment = () => {
    if (window.payment_url) window.location.href = window.payment_url;
};

window.openEntryForm = () => {
    window.location.href = '/submit';
};

document.addEventListener('DOMContentLoaded', initApp);
setInterval(initApp, UPDATE_INTERVAL);