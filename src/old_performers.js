const initPerformers = async () => {
    const { color: themeColor } = typeof applyGlobalTheme === 'function' ? applyGlobalTheme() : { color: 'indigo' };

    try {
        const container = document.getElementById('performers-body');
        if (container) {
            container.innerHTML = `
                <tr class="block md:table-row w-full animate-pulse">
                    <td colspan="5" class="block md:table-cell w-full p-8 text-center">
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
        const contestants = data.sheetData?.contestants || [];

        if (typeof initTicker === 'function') {
            initTicker(data.prices || [], contestants);
        }

        if (controls?.title) {
            updateSiteTitle(controls.title);
        }

        if (!container) return;

        if (!records || records.length === 0) {
            container.innerHTML = `
                <tr class="block md:table-row w-full">
                    <td colspan="5" class="block md:table-cell w-full p-8 text-center">
                        <div class="flex flex-col items-center justify-center p-12 rounded-[2.5rem] bg-${themeColor}-950/20 border border-${themeColor}-500/10">
                            <div class="text-5xl mb-4 opacity-50 grayscale">📉</div>
                            <h3 class="text-lg font-black text-white uppercase tracking-widest mb-2">No Records Found</h3>
                            <p class="text-${themeColor}-300/50 text-xs font-bold uppercase tracking-widest">The archives appear to be empty.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        const stats = {};
        records.forEach(row => {
            const uuid = row.user_uuid;
            if (!stats[uuid]) {
                stats[uuid] = {
                    name: row.name,
                    uuid: uuid,
                    seasons: 0,
                    totalReturn: 0,
                    gold: 0,
                    silver: 0,
                    bronze: 0
                };
            }
            
            stats[uuid].seasons += 1;
            stats[uuid].totalReturn += (parseFloat(row.percent_gain) || 0);
            
            const place = parseInt(row.place);
            if (place === 1) stats[uuid].gold++;
            else if (place === 2) stats[uuid].silver++;
            else if (place === 3) stats[uuid].bronze++;
        });

        const leaderboard = Object.values(stats).map(s => ({
            ...s,
            avgReturn: s.totalReturn / s.seasons
        })).sort((a, b) => b.avgReturn - a.avgReturn);

        container.innerHTML = leaderboard.map((row, index) => {
            const avg = row.avgReturn.toFixed(2);
            const isPos = row.avgReturn >= 0;
            
            return `
                <tr class="block md:table-row hover:bg-${themeColor}-500/5 transition-all border-b border-${themeColor}-500/10 last:border-0 group">
                    <td class="hidden md:table-cell px-8 py-6 font-mono font-bold text-${themeColor}-400">#${index + 1}</td>
                    <td class="px-8 py-4 block md:table-cell">
                        <div class="flex items-center gap-4">
                            <span class="md:hidden text-xs font-mono text-${themeColor}-400 font-bold w-6">#${index + 1}</span>
                            <a href="/stats?uuid=${row.uuid}" class="text-white font-black hover:text-${themeColor}-400 transition-all cursor-pointer group flex items-center gap-2">
                                <span class="text-lg md:text-base">${typeof escapeHtml === 'function' ? escapeHtml(row.name) : row.name}</span>
                                <span class="text-[8px] opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all bg-${themeColor}-500/20 px-2 py-0.5 rounded border border-${themeColor}-500/30 text-${themeColor}-300 whitespace-nowrap">
                                    VIEW CAREER
                                </span>
                            </a>
                        </div>
                    </td>
                    <td class="px-8 py-3 md:py-6 block md:table-cell text-left md:text-center">
                        <span class="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">Seasons</span>
                        <div class="flex flex-col items-end md:block">
                            <div class="font-mono text-slate-300 font-bold">${row.seasons}</div>
                        </div>
                    </td>
                    <td class="px-8 py-3 md:py-6 block md:table-cell text-left md:text-center">
                        <span class="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">Medals</span>
                        <div class="flex flex-col items-end md:block">
                            <div class="flex justify-end md:justify-center gap-2 text-xs font-bold">
                                ${row.gold > 0 ? `<span class="px-2 py-1 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20" title="Gold">🥇 ${row.gold}</span>` : ''}
                                ${row.silver > 0 ? `<span class="px-2 py-1 bg-slate-500/10 text-slate-300 rounded border border-slate-500/20" title="Silver">🥈 ${row.silver}</span>` : ''}
                                ${row.bronze > 0 ? `<span class="px-2 py-1 bg-orange-500/10 text-orange-400 rounded border border-orange-500/20" title="Bronze">🥉 ${row.bronze}</span>` : ''}
                                ${row.gold === 0 && row.silver === 0 && row.bronze === 0 ? '<span class="text-slate-700">-</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td class="px-8 py-3 md:py-6 block md:table-cell text-left md:text-right">
                        <span class="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">Avg Return</span>
                        <div class="flex flex-col items-end md:block">
                            <div class="font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'} text-lg md:text-base">
                                ${isPos ? '+' : ''}${avg}%
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Performers Load Error:", err);
        const container = document.getElementById('performers-body');
        if (container) {
            container.innerHTML = `
                <tr class="block md:table-row w-full">
                    <td colspan="5" class="block md:table-cell w-full p-8 text-center">
                        <div class="flex flex-col items-center justify-center p-12 rounded-[2.5rem] bg-red-950/20 border border-red-500/10">
                            <div class="text-5xl mb-4 opacity-50 grayscale">⚠️</div>
                            <h3 class="text-lg font-black text-white uppercase tracking-widest mb-2">System Error</h3>
                            <p class="text-red-300/50 text-xs font-bold uppercase tracking-widest">Unable to load performers data.</p>
                        </div>
                    </td>
                </tr>`;
        }
    }
};

const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (typeof window !== 'undefined' && !isTest) {
    document.addEventListener('DOMContentLoaded', initPerformers);
}

if (typeof module !== 'undefined') {
    module.exports = { initPerformers };
}

const _safelist = `
    hover:bg-emerald-500/5 border-emerald-500/10 text-emerald-400 hover:text-emerald-400
    hover:bg-orange-500/5 border-orange-500/10 text-orange-400 hover:text-orange-400
    bg-amber-500/10 text-amber-400 border-amber-500/20
    bg-slate-500/10 text-slate-300 border-slate-500/20
    bg-emerald-500/20 border-emerald-500/30 text-emerald-300
    bg-orange-500/20 border-orange-500/30 text-orange-300
    bg-emerald-950/20 border-emerald-500/10 text-emerald-300/50
    bg-orange-950/20 border-orange-500/10 text-orange-300/50
    bg-indigo-950/20 border-indigo-500/10 text-indigo-300/50
    bg-red-950/20 border-red-500/10 text-red-300/50
`;