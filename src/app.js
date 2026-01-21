const UPDATE_INTERVAL = 5 * 60 * 1000;
const CURRENCY_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

const { color: themeColor, icon: themeIcon } = applyGlobalTheme();

let currentPrizes = {};

const PRIZE_STYLES = {
    0: "bg-amber-500/20 text-amber-500 border-amber-500/50",
    1: `bg-${themeColor}-300/20 text-${themeColor}-300 border-${themeColor}-300/50`,
    2: "bg-orange-600/20 text-orange-400 border-orange-600/50",
    "last": "bg-red-500/20 text-red-400 border-red-500/50"
};

const initApp = async () => {
    const container = document.getElementById('leaderboard-body');
    if (container && container.children.length === 0) {
        container.innerHTML = `
            <tr class="block md:table-row w-full animate-pulse">
                <td colspan="6" class="block md:table-cell w-full p-8 text-center">
                    <div class="flex flex-col items-center justify-center p-12 rounded-[2.5rem] bg-${themeColor}-950/20 border border-${themeColor}-500/10">
                        <div class="text-5xl mb-4 opacity-50 grayscale">⏳</div>
                        <h3 class="text-lg font-black text-white uppercase tracking-widest mb-2">Syncing Data</h3>
                        <p class="text-${themeColor}-300/50 text-xs font-bold uppercase tracking-widest">Fetching latest updates...</p>
                    </div>
                </td>
            </tr>`;
    }

    try {
        const response = await fetch(`/.netlify/functions/fetch-data`);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || "Network response was not ok");
        }
        
        const data = await response.json();
        const { sheetData, prices, isMarketOpen, holidayName } = data;
        
        updateMarketStatus({ isMarketOpen, holidayName });

        const now = new Date();
        const seasonOpen = isContestEntryOpen(now);
        const canJoin = seasonOpen;

        if (sheetData.controls?.title) {
            updateSiteTitle(sheetData.controls.title);
        }

        currentPrizes = { benchmarks: {} };
        sheetData.prizes.forEach(p => {
            const rank = p.rank?.toString().toLowerCase();
            if (rank) {                
                let emoji = p.emoji;
                currentPrizes[rank] = { emoji: emoji || '💰', amount: p.amount || '$0.00' };
            }
        });

        sheetData.benchmarks.forEach(b => {
            if (b.ticker) {
                currentPrizes.benchmarks[b.ticker.toUpperCase()] = { 
                    name: b.name || b.ticker, 
                    price: parseFloat(b.price) 
                };
            }
        });

        const contestants = sheetData.contestants || [];
        
        if (contestants.length === 0 || (contestants.length === 1 && !contestants[0].ticker)) {
            renderEmptyState(canJoin, seasonOpen, isMarketOpen);
            updateStats([]);
            updateTopMover([]);
        } else {
            const results = contestants.map(c => {
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

            renderLeaderboard(results, sheetData);
            updateStats(results);
            updateTopMover(results);
        }

        updateBenchmarks(prices);
        initTicker(prices, contestants);

        const controls = sheetData.controls;
        if (controls) {
            if (controls.payment_url) {
                const payBtn = document.getElementById('payment-btn');
                payBtn.innerText = controls.payment_text || 'Pay Entry Fee';
                window.payment_url = controls.payment_url;
            }

            const addBtn = document.getElementById('add-participant-btn');
            if (addBtn) {
                if (!canJoin) {
                    addBtn.disabled = true;
                    addBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    addBtn.onclick = null;
                    if (!seasonOpen) addBtn.innerText = "Season Starts Jan 2nd";
                }

                if (controls.cutoff) {
                    const regCutoff = new Date(controls.cutoff);
                    if (now > regCutoff) {
                        addBtn.disabled = true;
                        addBtn.innerText = "Registration Closed";
                        addBtn.classList.add('opacity-50', 'cursor-not-allowed');
                        addBtn.onclick = null;
                    }
                }
            }
        }

    } catch (err) {
        console.error("Critical System Failure:", err);
        const container = document.getElementById('leaderboard-body');
        if (container) {
            container.innerHTML = `
                <tr class="block md:table-row w-full">
                    <td colspan="6" class="block md:table-cell w-full p-8 text-center">
                        <div class="flex flex-col items-center justify-center p-12 rounded-[2.5rem] bg-red-950/20 border border-red-500/10">
                            <div class="text-5xl mb-4 opacity-50 grayscale">⚠️</div>
                            <h3 class="text-lg font-black text-white uppercase tracking-widest mb-2">System Error</h3>
                            <p class="text-red-300/50 text-xs font-bold uppercase tracking-widest">Unable to load dashboard data.</p>
                        </div>
                    </td>
                </tr>`;
        }
    }
};

function renderEmptyState(canJoin, isContestEntryOpen, isMarketOpen) {
    let btnHtml;
    if (canJoin) {
        btnHtml = `<button onclick="openEntryForm()" class="bg-gradient-to-r from-violet-500 to-${themeColor}-500 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all">Be the first to join</button>`;
    } else {
        let msg = "Registration Opens Soon";
        if (!isContestEntryOpen) msg = "Season Starts Jan 2nd";
        btnHtml = `<button disabled class="bg-slate-700 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] opacity-50 cursor-not-allowed">${msg}</button>`;
    }

    const container = document.getElementById('dashboard-content');
    container.innerHTML = `
        <div class="bg-${themeColor}-950/20 border border-${themeColor}-500/20 rounded-[40px] p-12 text-center my-8">
            <div class="text-6xl mb-6">${themeIcon}</div>
            <h2 class="text-2xl font-black text-white uppercase tracking-tight mb-3">Season Intermission</h2>
            <p class="text-${themeColor}-300/70 max-w-md mx-auto mb-8 font-medium">
                The previous contest has concluded and the board has been cleared. 
                Check the Hall of Fame for past winners while we prepare for the next round!
            </p>
            <div class="flex justify-center gap-4">
                ${btnHtml}
            </div>
        </div>
    `;
}

function renderLeaderboard(results, sheetData) {
    const container = document.getElementById('leaderboard-body');
    if (!container) return;

    const records = sheetData?.records || [];
    
    container.innerHTML = results.map((res, index) => {
        return `
        <tr class="block md:table-row hover:bg-${themeColor}-500/10 transition-all border-b border-${themeColor}-500/20 md:border-none">
            <td class="hidden md:table-cell px-8 py-4 font-mono font-bold text-${themeColor}-400">#${index + 1}</td>
            <td class="px-8 py-4 block md:table-cell">
                <div class="flex items-center gap-4">
                    <span class="md:hidden text-xs font-mono text-${themeColor}-400 font-bold w-6">#${index + 1}</span>
                    <div class="flex flex-col gap-1.5">
                        <div class="flex items-center gap-2">
                            <a href="/stats?uuid=${res.user_uuid}" class="text-white font-black hover:text-cyan-400 transition-all cursor-pointer group flex items-center gap-2">
                                <span class="text-base md:text-sm tracking-tight">${escapeHtml(res.name)}</span>
                                <span class="text-[8px] opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all bg-${themeColor}-500/20 px-2 py-0.5 rounded border border-${themeColor}-500/30 text-${themeColor}-300 whitespace-nowrap">
                                    VIEW CAREER
                                </span>
                            </a>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            ${getPrizeBadge(index, results.length)}
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-center">
                <span class="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">Stock</span>
                <div class="flex flex-col items-end md:items-center">
                    <span class="bg-${themeColor}-500/20 text-${themeColor}-200 px-2.5 py-1 rounded text-[10px] font-black tracking-widest border border-${themeColor}-500/30">${escapeHtml(res.ticker)}</span>
                    <span class="text-[9px] text-slate-300 mt-2 font-bold uppercase tracking-widest">${escapeHtml(res.stockname)}</span>
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
        `;
    }).join('');
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
                <div class="bg-${themeColor}-500/5 border border-${themeColor}-500/10 p-4 rounded-3xl flex items-center gap-4 flex-1 min-w-[140px]">
                    <div class="${isPos ? 'bg-emerald-500/20' : 'bg-red-500/20'} p-2.5 rounded-xl text-xs font-black">${ticker}</div>
                    <div>
                        <p class="text-[9px] text-${themeColor}-300/70 uppercase font-black tracking-widest">${config[ticker].name}</p>
                        <div class="flex items-baseline gap-1">
                            <p class="text-sm font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'}">${isPos ? '+' : ''}${pct.toFixed(2)}%</p>
                            <span class="text-[8px] text-${themeColor}-300/50 font-bold uppercase">YTD</span>
                        </div>
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

function updateMarketStatus(status) {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (!dot || !text) return;

    if (status?.isMarketOpen) {
        dot.className = "h-2 w-2 rounded-full bg-emerald-500 animate-ping";
        text.innerText = "Market Open";
    } else {
        dot.className = "h-2 w-2 rounded-full bg-red-500";
        text.innerText = status?.holidayName ? `Market Closed (${status.holidayName})` : "Market Closed";
    }
}

function updateTopMover(results) {
    const el = document.getElementById('top-mover-name');
    if (results.length === 0) {
        if (el) el.innerText = "N/A";
        return;
    }
    const top = [...results].sort((a, b) => b.dailyChange - a.dailyChange)[0];
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

window.triggerPayment = () => {
    if (window.payment_url) window.location.href = window.payment_url;
};

window.openEntryForm = () => {
    window.location.href = '/submit';
};

document.addEventListener('DOMContentLoaded', initApp);
setInterval(initApp, UPDATE_INTERVAL);

const _safelist = `
    bg-emerald-300/20 text-emerald-300 border-emerald-300/50 bg-emerald-950/20 
    border-emerald-500/20 text-emerald-300/70 to-emerald-500 hover:bg-emerald-500/10 
    border-emerald-500/20 text-emerald-400 bg-emerald-500/20 border-emerald-500/30 
    text-emerald-200 bg-emerald-500/5 border-emerald-500/10
    bg-emerald-950/20 border-emerald-500/10 text-emerald-300/50
    bg-orange-950/20 border-orange-500/10 text-orange-300/50
    bg-indigo-950/20 border-indigo-500/10 text-indigo-300/50
`;