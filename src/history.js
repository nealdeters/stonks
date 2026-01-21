document.addEventListener('DOMContentLoaded', async () => {
    const { color: themeColor } = typeof applyGlobalTheme === 'function' ? applyGlobalTheme() : { color: 'indigo' };
    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');

    if (!year) {
        window.location.href = '/portfolio.html';
        return;
    }

    document.getElementById('year-title').textContent = `${year} Contest`;
    document.title = `Stonks - ${year} History`;

    try {
        const response = await fetch('/.netlify/functions/fetch-data');
        const data = await response.json();
        
        if (data.prices && typeof initTicker === 'function') {
            initTicker(data.prices);
        }

        const records = data.sheetData?.records || [];
        // Filter by year and sort by place (ascending)
        const yearRecords = records
            .filter(r => r.year == year)
            .sort((a, b) => parseInt(a.place) - parseInt(b.place));

        const tbody = document.getElementById('history-body');
        tbody.innerHTML = '';

        if (yearRecords.length === 0) {
             tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">No records found for ${year}</td></tr>`;
             return;
        }

        yearRecords.forEach(r => {
            const isWin = r.place == '1';
            const gain = parseFloat(r.percent_gain || r.return || 0);
            
            const row = document.createElement('tr');
            row.className = "block md:table-row hover:bg-indigo-500/5 transition-all border-b border-indigo-500/10 md:border-none group";
            
            row.innerHTML = `
                <td class="hidden md:table-cell px-8 py-4 font-mono font-bold text-${themeColor}-400">#${r.place}</td>
                <td class="px-8 py-4 block md:table-cell">
                    <div class="flex items-center gap-4">
                        <span class="md:hidden text-xs font-mono text-${themeColor}-400 font-bold">#${r.place}</span>
                        <div>
                            <div class="flex items-center gap-2">
                                <a href="/stats.html?uuid=${r.user_uuid}" class="text-white font-black hover:text-${themeColor}-400 transition-all cursor-pointer group flex items-center gap-2">
                                    <span class="text-base md:text-sm tracking-tight">${typeof escapeHtml === 'function' ? escapeHtml(r.name) : r.name}</span>
                                    <span class="text-[8px] opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all bg-${themeColor}-500/20 px-2 py-0.5 rounded border border-${themeColor}-500/30 text-${themeColor}-300 whitespace-nowrap">VIEW CAREER</span>
                                </a>
                            </div>
                            ${isWin ? `<span class="mt-1.5 block w-fit px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter bg-amber-500/20 text-amber-500 border-amber-500/50"><span class="mr-1">🥇</span>Winner</span>` : ''}
                        </div>
                    </div>
                </td>
                <td class="px-8 py-3 md:py-5 block md:table-cell text-left md:text-center">
                    <span class="text-indigo-300/70 text-[10px] uppercase font-black md:hidden pt-1">Stock</span>
                    <div class="flex flex-col items-end md:items-center">
                        <span class="bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded text-[10px] font-black tracking-widest leading-none">${r.ticker}</span>
                    </div>
                </td>
                <td class="px-8 py-5 block md:table-cell text-left md:text-right">
                    <span class="text-indigo-300/70 text-[10px] uppercase font-black md:hidden">% Return</span>
                    <div class="flex flex-col items-end">
                        <p class="text-lg md:text-sm font-black ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                            ${gain > 0 ? '+' : ''}${gain.toFixed(2)}%
                        </p>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading history:', error);
        const tbody = document.getElementById('history-body');
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-500 font-bold">Error loading data</td></tr>`;
    }
});