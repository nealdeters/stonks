const initWinners = async () => {
    try {
        const response = await fetch(`/.netlify/functions/fetch-data?cb=${Date.now()}`);
        const data = await response.json();
        
        // Accessing the winners array
        const winners = data.sheetData?.winners || data.winners;
        const controls = data.sheetData?.controls || data.controls;

        // Update Header & Title
        if (controls?.title) {
            const titleEl = document.querySelector('header h1');
            if (titleEl) titleEl.innerText = controls.title;
            document.title = `${controls.title} - Hall of Fame`;
        }

        const container = document.getElementById('winners-body');
        if (!container) return;

        // Ensure winners exists and has data
        if (!winners || winners.length === 0) {
            container.innerHTML = `<div class="p-20 text-center text-slate-500 font-black uppercase tracking-widest">History in the making...</div>`;
            return;
        }

        // Map the Objects to HTML
        container.innerHTML = winners.map(winnerRow => {
            // Accessing object properties directly
            const year = winnerRow.year || "N/A";
            
            return `
            <div class="p-8 border-b border-indigo-500/10 last:border-0 hover:bg-indigo-500/5 transition-all">
                <div class="flex flex-col md:flex-row md:items-center gap-8">
                    <div class="shrink-0">
                        <span class="text-5xl font-black text-white italic tracking-tighter opacity-80">${year}</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                        ${renderWinnerSlot(winnerRow.first_user_name, winnerRow.first_user_uuid, '1st', 'amber-400', '🥇')}
                        ${renderWinnerSlot(winnerRow.second_user_name, winnerRow.second_user_uuid, '2nd', 'slate-300', '🥈')}
                        ${renderWinnerSlot(winnerRow.third_user_name, winnerRow.third_user_uuid, '3rd', 'orange-400', '🥉')}
                    </div>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error("Critical System Failure:", err);
        const container = document.getElementById('winners-body');
        if (container) {
            container.innerHTML = `<div class="p-20 text-center text-red-500 font-black">SYSTEM ERROR: Check console.</div>`;
        }
    }
};

function renderWinnerSlot(name, uuid, rank, color, emoji) {
    if (!name || name.trim() === "") {
        return `<div class="hidden md:block bg-indigo-500/5 rounded-2xl border border-indigo-500/5 h-16"></div>`;
    }

    return `
    <a href="/stats?uuid=${uuid}" class="flex items-center gap-4 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 hover:border-${color}/50 transition-all group shadow-lg">
        <div class="text-2xl">${emoji}</div>
        <div class="overflow-hidden">
            <p class="text-[9px] font-black uppercase tracking-widest text-${color}">${rank} Place</p>
            <p class="text-sm font-bold text-white group-hover:text-${color} transition-colors truncate">${name}</p>
        </div>
    </a>`;
}

document.addEventListener('DOMContentLoaded', initWinners);