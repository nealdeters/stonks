const initTicker = (prices) => {
    if (!prices || prices.length === 0) return;

    if (!document.getElementById('ticker-style')) {
        const style = document.createElement('style');
        style.id = 'ticker-style';
        style.innerHTML = `
            @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
            }
            .animate-marquee {
                animation: marquee 60s linear infinite;
                display: inline-block;
                white-space: nowrap;
            }
            .animate-marquee:hover {
                animation-play-state: paused;
            }
            .ticker-container {
                width: 100%;
                background-color: rgba(30, 27, 75, 0.3);
                border-top: 1px solid rgba(99, 102, 241, 0.2);
                border-bottom: 1px solid rgba(99, 102, 241, 0.2);
                overflow: hidden;
                padding: 0.5rem 0;
                margin-top: 0;
                margin-bottom: 0;
                position: relative;
                z-index: 40;
            }
        `;
        document.head.appendChild(style);
    }

    let container = document.getElementById('stock-ticker-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'stock-ticker-container';
        container.className = 'ticker-container';
        
        const inner = document.createElement('div');
        inner.id = 'stock-ticker-inner';
        inner.className = 'animate-marquee';
        container.appendChild(inner);

        const header = document.querySelector('header');
        if (header) {
            header.style.display = 'flex';
            header.style.flexDirection = 'column';
            header.style.height = 'auto';

            if (header.firstElementChild) {
                header.firstElementChild.classList.add('py-4');
            }

            header.appendChild(container);
        } else {
            document.body.prepend(container);
        }
    }

    const displayItems = [...prices, ...prices, ...prices, ...prices];
    
    const inner = document.getElementById('stock-ticker-inner');
    inner.innerHTML = displayItems.map(p => {
        const isUp = p.dp >= 0;
        const color = isUp ? 'text-emerald-400' : 'text-red-400';
        const arrow = isUp ? '▲' : '▼';

        return `
            <span class="inline-flex items-center gap-2 mx-6 text-xs font-bold font-mono">
                <span class="text-white/90">${escapeHtml(p.ticker)}</span>
                <span class="${color}">${arrow} ${Math.abs(p.dp).toFixed(2)}%</span>
            </span>
        `;
    }).join('');
};

if (typeof module !== 'undefined') {
    module.exports = { initTicker };
}
if (typeof window !== 'undefined') {
    window.initTicker = initTicker;
}