const initStats = async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetUuid = urlParams.get('uuid');

        if (!targetUuid) {
            window.location.href = '/winners';
            return;
        }

        const response = await fetch(`/.netlify/functions/fetch-data?cb=${Date.now()}`);
        const data = await response.json();
        
        // Use the same mapping logic as Winners (Object-based)
        const records = data.sheetData?.records || data.records;

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

            return `
                <tr class="hover:bg-indigo-500/5 transition-all">
                    <td class="px-8 py-6 font-mono font-bold text-indigo-400">${row.year}</td>
                    <td class="px-8 py-6">
                        <span class="text-white font-black">${row.ticker}</span>
                        <p class="text-[9px] text-slate-500 uppercase tracking-widest mt-1">${row.capital} Investment</p>
                    </td>
                    <td class="px-8 py-6 text-center">
                        <span class="${isWin ? 'text-amber-400 font-black' : 'text-slate-400'}">
                            ${row.place}${placeEmoji}
                        </span>
                    </td>
                    <td class="px-8 py-6 text-right font-mono font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                        ${gain >= 0 ? '+' : ''}${gain.toFixed(2)}%
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