const initWinners = async () => {
    const { color: themeColor } = applyGlobalTheme();

    try {
        const response = await fetch(`/.netlify/functions/fetch-data`);
        const data = await response.json();
        
        // Accessing the winners array
        const winners = data.sheetData?.winners || data.winners;
        const controls = data.sheetData?.controls || data.controls;

        // Update Header & Title
        if (controls?.title) {
            updateSiteTitle(controls.title);
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
            <div class="p-8 border-b border-${themeColor}-500/10 last:border-0 hover:bg-${themeColor}-500/5 transition-all">
                <div class="flex flex-col md:flex-row md:items-center gap-8">
                    <div class="shrink-0">
                        <span class="text-5xl font-black text-white italic tracking-tighter opacity-80">${year}</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                        ${renderWinnerSlot(winnerRow.first_user_name, winnerRow.first_user_uuid, '1st', 'amber-400', '🥇', themeColor)}
                        ${renderWinnerSlot(winnerRow.second_user_name, winnerRow.second_user_uuid, '2nd', 'slate-300', '🥈', themeColor)}
                        ${renderWinnerSlot(winnerRow.third_user_name, winnerRow.third_user_uuid, '3rd', 'orange-400', '🥉', themeColor)}
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

function renderWinnerSlot(name, uuid, rank, color, emoji, themeColor = 'indigo') {
    if (!name || name.trim() === "") {
        return `<div class="hidden md:block bg-${themeColor}-500/5 rounded-2xl border border-${themeColor}-500/5 h-16"></div>`;
    }

    return `
    <a href="/stats?uuid=${uuid}" class="flex items-center gap-4 p-4 rounded-2xl bg-${themeColor}-950/40 border border-${themeColor}-500/20 hover:border-${color}/50 transition-all group shadow-lg">
        <div class="text-2xl">${emoji}</div>
        <div class="overflow-hidden">
            <p class="text-[9px] font-black uppercase tracking-widest text-${color}">${rank} Place</p>
            <p class="text-sm font-bold text-white group-hover:text-${color} transition-colors truncate">${name}</p>
        </div>
    </a>`;
}

document.addEventListener('DOMContentLoaded', initWinners);

// Tailwind Safelist for Winners
const _safelist = `
    border-emerald-500/10 hover:bg-emerald-500/5 bg-emerald-500/5 
    border-emerald-500/5 bg-emerald-950/40 border-emerald-500/20
`;