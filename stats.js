const initStats = async () => {
    const { color: themeColor } = applyGlobalTheme();

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetUuid = urlParams.get('uuid');

        if (!targetUuid) {
            window.location.href = '/winners';
            return;
        }

        const response = await fetch(`/.netlify/functions/fetch-data`);
        const data = await response.json();
        
        // Use the same mapping logic as Winners (Object-based)
        const records = data.sheetData?.records || data.records;
        const controls = data.sheetData?.controls || data.controls;
        const prices = data.prices || [];
        const stockNames = data.stockNames || {};

        if (controls?.title) {
            updateSiteTitle(controls.title);
        }

        if (!records || records.length === 0) {
            document.getElementById('stats-body').innerHTML = `<tr><td colspan="4" class="p-20 text-center text-slate-500">No career records found.</td></tr>`;
            return;
        }

        // Filter records for this specific UUID
        const userHistory = records.filter(row => row.user_uuid === targetUuid);

        if (userHistory.length === 0) {
            document.getElementById('stats-body').innerHTML = `<tr><td colspan="4" class="p-20 text-center text-slate-500">No performance history found for this ID.</td></tr>`;
            return;
        }

        // 1. Dynamic Title: "${name} Stats"
        const userName = userHistory[0].name || "Participant";
        document.getElementById('user-name-title').innerText = `${userName} Stats`;
        document.title = `${userName} - Performance Stats`;

        const goldCount = userHistory.filter(row => parseInt(row.place) === 1).length;
        const silverCount = userHistory.filter(row => parseInt(row.place) === 2).length;
        const bronzeCount = userHistory.filter(row => parseInt(row.place) === 3).length;

        const totalSeasons = userHistory.length;
        const returns = userHistory.map(row => parseFloat(row.percent_gain) || 0);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / totalSeasons;

        // 2. Inject Summary Stats
        document.getElementById('stat-seasons').innerText = totalSeasons;
        document.getElementById('stat-avg-return').innerText = `${avgReturn.toFixed(2)}%`;

        // Inject Medal Counts
        document.getElementById('stat-gold').innerText = goldCount;
        document.getElementById('stat-silver').innerText = silverCount;
        document.getElementById('stat-bronze').innerText = bronzeCount;

        // 4. Render Table Rows
        const container = document.getElementById('stats-body');
        container.innerHTML = userHistory.map(row => {
            const isWin = parseInt(row.place) === 1;
            const placeEmoji = isWin ? '🥇' : parseInt(row.place) === 2 ? '🥈' : parseInt(row.place) === 3 ? '🥉' : '';
            const gain = parseFloat(row.percent_gain) || 0;
            const tickerUpper = (row.ticker || '').toUpperCase();
            const stockName = row.stockname || stockNames[tickerUpper] || prices.find(p => p.ticker === tickerUpper)?.name || 'Stock';

            return `
                <tr class="block md:table-row hover:bg-${themeColor}-500/5 transition-all border-b border-${themeColor}-500/10 last:border-0">
                    <td class="px-8 py-4 md:py-6 block md:table-cell">
                        <div class="flex justify-between items-center md:block">
                            <span class="text-slate-400 text-[10px] uppercase font-black md:hidden">Year</span>
                            <span class="font-mono font-bold text-${themeColor}-400">${row.year}</span>
                        </div>
                    </td>
                    <td class="px-8 py-2 md:py-6 block md:table-cell">
                        <div class="flex justify-between items-center md:block">
                            <span class="text-slate-400 text-[10px] uppercase font-black md:hidden">Stock Pick</span>
                            <div class="text-right md:text-left">
                                <span class="text-white font-black">${row.ticker}</span>
                                <p class="text-[9px] text-slate-500 uppercase tracking-widest mt-1">${stockName}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-8 py-2 md:py-6 block md:table-cell text-left md:text-center">
                        <div class="flex justify-between items-center md:block">
                            <span class="text-slate-400 text-[10px] uppercase font-black md:hidden">Place</span>
                            <span class="${isWin ? 'text-amber-400 font-black' : 'text-slate-400'}">
                                ${row.place}${placeEmoji}
                            </span>
                        </div>
                    </td>
                    <td class="px-8 py-4 md:py-6 block md:table-cell text-right">
                        <div class="flex justify-between items-center md:block">
                            <span class="text-slate-400 text-[10px] uppercase font-black md:hidden">% Return</span>
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
        document.getElementById('stats-body').innerHTML = `<tr><td colspan="4" class="p-20 text-center text-red-500 font-black uppercase">Critical System Failure: Check Console</td></tr>`;
    }
};

document.addEventListener('DOMContentLoaded', initStats);

// Check if we are in a browser and NOT in a test environment
const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (typeof window !== 'undefined' && !isTest) {
    document.addEventListener('DOMContentLoaded', initStats);
}

// Export for Node/Testing
if (typeof module !== 'undefined') {
    module.exports = { initStats };
}

// Tailwind Safelist for Stats
const _safelist = "hover:bg-emerald-500/5 text-emerald-400";