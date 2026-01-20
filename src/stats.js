const initStats = async () => {
    const { color: themeColor } = applyGlobalTheme();

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetUuid = urlParams.get('uuid');

        if (!targetUuid) {
            window.location.href = '/winners';
            return;
        }

        const container = document.getElementById('stats-body');
        if (container) {
            container.innerHTML = `
                <tr class="block md:table-row w-full animate-pulse">
                    <td colspan="4" class="block md:table-cell w-full p-8 text-center">
                        <div class="flex flex-col items-center justify-center p-12 rounded-[2.5rem] bg-${themeColor}-950/20 border border-${themeColor}-500/10">
                            <div class="text-5xl mb-4 opacity-50 grayscale">⏳</div>
                            <h3 class="text-lg font-black text-white uppercase tracking-widest mb-2">Syncing Data</h3>
                            <p class="text-${themeColor}-300/50 text-xs font-bold uppercase tracking-widest">Fetching latest updates...</p>
                        </div>
                    </td>
                </tr>`;
        }

        const response = await fetch(`/.netlify/functions/fetch-data`);
        const data = await response.json();
        
        const records = data.sheetData?.records || data.records;
        const controls = data.sheetData?.controls || data.controls;
        const prices = data.prices || [];
        const stockNames = data.stockNames || {};
        const contestants = data.sheetData?.contestants || [];

        initTicker(prices, contestants);

        if (controls?.title) {
            updateSiteTitle(controls.title);
        }

        if (!records || records.length === 0) {
            document.getElementById('stats-body').innerHTML = `
                <tr class="block md:table-row w-full">
                    <td colspan="4" class="block md:table-cell w-full p-8 text-center">
                        <div class="flex flex-col items-center justify-center p-12 rounded-[2.5rem] bg-${themeColor}-950/20 border border-${themeColor}-500/10">
                            <div class="text-5xl mb-4 opacity-50 grayscale">📭</div>
                            <h3 class="text-lg font-black text-white uppercase tracking-widest mb-2">No Data Available</h3>
                            <p class="text-${themeColor}-300/50 text-xs font-bold uppercase tracking-widest">Global records are currently empty.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        const userHistory = records
            .filter(row => row.user_uuid === targetUuid)
            .sort((a, b) => parseInt(b.year) - parseInt(a.year));

        if (userHistory.length === 0) {
            document.getElementById('stats-body').innerHTML = `
                <tr class="block md:table-row w-full">
                    <td colspan="4" class="block md:table-cell w-full p-8 text-center">
                        <div class="flex flex-col items-center justify-center p-12 rounded-[2.5rem] bg-${themeColor}-950/20 border border-${themeColor}-500/10">
                            <div class="text-5xl mb-4 opacity-50 grayscale">👻</div>
                            <h3 class="text-lg font-black text-white uppercase tracking-widest mb-2">Participant Not Found</h3>
                            <p class="text-${themeColor}-300/50 text-xs font-bold uppercase tracking-widest mb-6">We couldn't find any history for this ID.</p>
                            <a href="/performers" class="px-6 py-3 rounded-xl bg-${themeColor}-500/10 hover:bg-${themeColor}-500/20 text-${themeColor}-300 text-[10px] font-black uppercase tracking-widest transition-all border border-${themeColor}-500/20">
                                View All Performers
                            </a>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        const userName = userHistory[0].name || "Participant";
        document.getElementById('user-name-title').innerText = `${userName}`;
        document.title = `${userName} - Career Performance`;

        const goldCount = userHistory.filter(row => parseInt(row.place) === 1).length;
        const silverCount = userHistory.filter(row => parseInt(row.place) === 2).length;
        const bronzeCount = userHistory.filter(row => parseInt(row.place) === 3).length;

        const totalSeasons = userHistory.length;
        const returns = userHistory.map(row => parseFloat(row.percent_gain) || 0);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / totalSeasons;

        document.getElementById('stat-seasons').innerText = totalSeasons;
        document.getElementById('stat-avg-return').innerText = `${avgReturn.toFixed(2)}%`;

        document.getElementById('stat-gold').innerText = goldCount;
        document.getElementById('stat-silver').innerText = silverCount;
        document.getElementById('stat-bronze').innerText = bronzeCount;

        container.innerHTML = userHistory.map(row => {
            const isWin = parseInt(row.place) === 1;
            const placeEmoji = isWin ? '🥇' : parseInt(row.place) === 2 ? '🥈' : parseInt(row.place) === 3 ? '🥉' : '';
            const gain = parseFloat(row.percent_gain) || 0;
            const tickerUpper = (row.ticker || '').toUpperCase();
            const stockName = row.stockname || stockNames[tickerUpper] || prices.find(p => p.ticker === tickerUpper)?.name || 'Stock';

            return `
                <tr class="block md:table-row hover:bg-${themeColor}-500/5 transition-all border-b border-${themeColor}-500/10 last:border-0">
                    <td class="px-8 py-4 block md:table-cell">
                        <div class="flex items-center gap-4">
                            <span class="font-mono font-bold text-${themeColor}-400 text-lg md:text-base">${row.year}</span>
                        </div>
                    </td>
                    <td class="px-8 py-3 md:py-6 block md:table-cell text-left md:text-left">
                        <span class="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">Stock Pick</span>
                        <div class="flex flex-col items-end md:block">
                            <span class="text-white font-black">${escapeHtml(row.ticker)}</span>
                            <p class="text-[9px] text-slate-500 uppercase tracking-widest mt-1">${escapeHtml(stockName)}</p>
                        </div>
                    </td>
                    <td class="px-8 py-3 md:py-6 block md:table-cell text-left md:text-center">
                        <span class="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">Place</span>
                        <div class="flex flex-col items-end md:block">
                            <span class="${isWin ? 'text-amber-400 font-black' : 'text-slate-400'}">
                                ${row.place}${placeEmoji}
                            </span>
                        </div>
                    </td>
                    <td class="px-8 py-3 md:py-6 block md:table-cell text-left md:text-right">
                        <span class="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">% Return</span>
                        <div class="flex flex-col items-end md:block">
                            <span class="font-mono font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                                ${gain >= 0 ? '+' : ''}${gain.toFixed(2)}%
                            </span>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Stats Load Error:", err);
        document.getElementById('stats-body').innerHTML = `<tr class="block md:table-row w-full"><td colspan="4" class="block md:table-cell w-full p-20 text-center text-red-500 font-black uppercase">Critical System Failure: Check Console</td></tr>`;
    }
};

const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (typeof window !== 'undefined' && !isTest) {
    document.addEventListener('DOMContentLoaded', initStats);
}

if (typeof module !== 'undefined') {
    module.exports = { initStats };
}

const _safelist = `
    hover:bg-emerald-500/5 text-emerald-400
    hover:bg-orange-500/5 text-orange-400
    bg-emerald-950/20 border-emerald-500/10 text-emerald-300/50
    bg-orange-950/20 border-orange-500/10 text-orange-300/50
    bg-indigo-950/20 border-indigo-500/10 text-indigo-300/50
    text-red-500
`;