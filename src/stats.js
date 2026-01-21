document.addEventListener('DOMContentLoaded', async () => {
    const { color: themeColor } = typeof applyGlobalTheme === 'function' ? applyGlobalTheme() : { color: 'indigo' };
    const urlParams = new URLSearchParams(window.location.search);
    const uuid = urlParams.get('uuid');

    if (!uuid) {
        window.location.href = '/performers';
        return;
    }

    // Helper to safely parse return strings
    const parseReturn = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(String(val).replace(/[%+]/g, ''));
    };

    try {
        const response = await fetch('/.netlify/functions/fetch-data');
        const data = await response.json();
        
        if (data.prices && typeof initTicker === 'function') {
            initTicker(data.prices);
        }

        const records = data.sheetData?.records || [];
        const userRecords = records.filter(r => r.user_uuid === uuid).sort((a, b) => b.year - a.year);

        if (userRecords.length > 0) {
            const name = userRecords[0].name;
            document.getElementById('user-name-title').textContent = name;
            document.title = `Stonks - ${name}`;
        }

        // Calculate Stats
        const seasons = userRecords.length;
        let totalReturn = 0;
        let gold = 0, silver = 0, bronze = 0;

        userRecords.forEach(r => {
            totalReturn += parseReturn(r.percent_gain || r.return);
            if (r.place == '1') gold++;
            if (r.place == '2') silver++;
            if (r.place == '3') bronze++;
        });

        const avgReturn = seasons > 0 ? totalReturn / seasons : 0;

        document.getElementById('stat-seasons').textContent = seasons;
        
        const avgEl = document.getElementById('stat-avg-return');
        avgEl.textContent = avgReturn.toFixed(2) + '%';
        avgEl.className = `text-2xl font-black ${avgReturn > 0 ? 'text-emerald-400' : (avgReturn < 0 ? 'text-red-400' : 'text-white')}`;

        document.getElementById('stat-gold').textContent = gold;
        document.getElementById('stat-silver').textContent = silver;
        document.getElementById('stat-bronze').textContent = bronze;

        const tbody = document.getElementById('stats-body');
        tbody.innerHTML = '';

        userRecords.forEach(r => {
            const gain = parseReturn(r.percent_gain || r.return);
            const placeEmoji = r.place == '1' ? '🥇' : (r.place == '2' ? '🥈' : (r.place == '3' ? '🥉' : ''));
            
            const row = document.createElement('tr');
            row.className = "block md:table-row hover:bg-indigo-500/5 transition-all border-b border-indigo-500/10 md:border-none group";
            
            row.innerHTML = `
                <td class="px-8 py-4 block md:table-cell">
                    <span class="text-indigo-300/70 text-[10px] uppercase font-black md:hidden">Year</span>
                    <div class="flex flex-col items-end md:items-start">
                        <a href="/history.html?year=${r.year}" class="font-black text-white hover:text-${themeColor}-400 transition-colors underline decoration-${themeColor}-500/30 underline-offset-4">${r.year}</a>
                    </div>
                </td>
                <td class="px-8 py-4 block md:table-cell">
                    <span class="text-indigo-300/70 text-[10px] uppercase font-black md:hidden">Stock</span>
                    <div class="flex flex-col items-end md:items-start">
                        <span class="bg-${themeColor}-500/10 text-${themeColor}-300 px-2.5 py-1 rounded text-[10px] font-black tracking-widest leading-none">${r.ticker}</span>
                    </div>
                </td>
                <td class="px-8 py-4 block md:table-cell md:text-center">
                    <span class="text-indigo-300/70 text-[10px] uppercase font-black md:hidden">Place</span>
                    <div class="flex flex-col items-end md:items-center">
                        <span class="font-bold text-white">${r.place} <span class="text-lg">${placeEmoji}</span></span>
                    </div>
                </td>
                <td class="px-8 py-4 block md:table-cell text-left md:text-right">
                    <span class="text-indigo-300/70 text-[10px] uppercase font-black md:hidden">% Return</span>
                    <div class="flex flex-col items-end">
                        <span class="font-black ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}">${gain > 0 ? '+' : ''}${gain.toFixed(2)}%</span>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading stats:', error);
    }
});