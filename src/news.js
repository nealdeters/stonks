const initNews = async () => {
    const { color: themeColor } = applyGlobalTheme();

    try {
        const container = document.getElementById('news-body');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full p-12 text-center">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-${themeColor}-500 mb-4"></div>
                    <p class="text-${themeColor}-300/50 text-xs font-bold uppercase tracking-widest">Loading Headlines...</p>
                </div>`;
        }

        const response = await fetch(`/.netlify/functions/fetch-news`);
        const data = await response.json();
        
        const news = data.news || [];
        const controls = data.controls;

        if (controls?.title) {
            updateSiteTitle(controls.title);
        }

        if (!container) return;

        if (news.length === 0) {
            container.innerHTML = `
                <div class="col-span-full p-12 rounded-[2.5rem] bg-${themeColor}-950/20 border border-${themeColor}-500/10 text-center">
                    <div class="text-5xl mb-4 opacity-50 grayscale">📰</div>
                    <h3 class="text-lg font-black text-white uppercase tracking-widest mb-2">No News Found</h3>
                    <p class="text-${themeColor}-300/50 text-xs font-bold uppercase tracking-widest">The markets are quiet today.</p>
                </div>`;
            return;
        }

        container.innerHTML = news.map(item => {
            const date = new Date(item.datetime * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const hasImage = item.image && item.image.startsWith('http');
            
            return `
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="group flex flex-col bg-${themeColor}-950/20 border border-${themeColor}-500/10 hover:border-${themeColor}-500/30 hover:bg-${themeColor}-500/5 transition-all rounded-3xl overflow-hidden h-full">
                    ${hasImage ? `
                        <div class="h-48 overflow-hidden relative">
                            <img src="${item.image}" alt="News Image" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500">
                            <div class="absolute top-4 left-4">
                                <span class="bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/10">
                                    ${item.ticker}
                                </span>
                            </div>
                        </div>
                    ` : `
                        <div class="p-6 pb-0 flex items-center gap-3">
                            <span class="bg-${themeColor}-500/20 text-${themeColor}-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-${themeColor}-500/20">
                                ${item.ticker}
                            </span>
                            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${item.source}</span>
                        </div>
                    `}
                    
                    <div class="p-6 flex flex-col flex-1">
                        <h3 class="text-lg font-bold text-white mb-3 leading-tight group-hover:text-${themeColor}-400 transition-colors line-clamp-3">
                            ${escapeHtml(item.headline)}
                        </h3>
                        <p class="text-sm text-slate-400 line-clamp-3 mb-4 flex-1">
                            ${escapeHtml(item.summary)}
                        </p>
                        <div class="flex items-center justify-between mt-auto pt-4 border-t border-${themeColor}-500/10">
                            <span class="text-[10px] text-slate-500 font-mono">${date}</span>
                            <span class="text-[10px] font-black uppercase tracking-widest text-${themeColor}-400 group-hover:translate-x-1 transition-transform">Read Story &rarr;</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

    } catch (err) {
        console.error("News Load Error:", err);
        const container = document.getElementById('news-body');
        if (container) {
            container.innerHTML = `<div class="col-span-full text-center text-red-500 font-black">Unable to load news feed.</div>`;
        }
    }
};

const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (typeof window !== 'undefined' && !isTest) {
    document.addEventListener('DOMContentLoaded', initNews);
}

if (typeof module !== 'undefined') {
    module.exports = { initNews };
}

const _safelist = `
    border-emerald-500/30 hover:border-emerald-500/30 hover:bg-emerald-500/5
    text-emerald-300 text-emerald-400 hover:text-emerald-400
    bg-emerald-950/20 border-emerald-500/10 border-emerald-500/20
`;