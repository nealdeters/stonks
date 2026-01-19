const getThemeConfig = () => {
    const isDecember = new Date().getMonth() === 11;
    return {
        isDecember,
        color: isDecember ? 'emerald' : 'indigo',
        icon: isDecember ? '🎄' : '🏁',
        topMoverIcon: isDecember ? '🎁' : '🚀'
    };
};

const applyGlobalTheme = () => {
    const theme = getThemeConfig();
    
    if (typeof document !== 'undefined') {
        const updateDOM = () => {
            const headerTitle = document.querySelector('header h1');
            if (headerTitle) {
                headerTitle.style.cursor = 'pointer';
                headerTitle.onclick = () => window.location.href = '/';
            }

            document.querySelectorAll('img[src*="icon"]').forEach(img => {
                img.style.cursor = 'pointer';
                img.onclick = () => window.location.href = '/';
            });

            const topMoverIconEl = document.getElementById('top-mover-icon');
            if (topMoverIconEl) topMoverIconEl.innerText = theme.topMoverIcon;

            if (!theme.isDecember) return;

            const replaceColor = (str) => str ? str.replace(/indigo/g, theme.color) : str;
            
            if (document.body) document.body.className = replaceColor(document.body.className);
            
            const header = document.querySelector('header');
            if (header) header.className = replaceColor(header.className);
            
            document.querySelectorAll('[class*="indigo"]').forEach(el => {
                el.className = replaceColor(el.className);
            });

            const iconLink = document.querySelector("link[rel~='icon']");
            if (iconLink) iconLink.href = '/icon-dec.png';

            const appleIcon = document.querySelector("link[rel='apple-touch-icon']");
            if (appleIcon) appleIcon.href = '/icon-dec-512.png';

            document.querySelectorAll('img[src*="icon.png"]').forEach(img => {
                img.src = '/icon-dec.png';
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateDOM);
        } else {
            updateDOM();
        }
    }
    
    return theme;
};

const updateSiteTitle = (title) => {
    if (!title || typeof document === 'undefined') return;

    // Update Header Title
    const headerTitle = document.querySelector('header h1');
    if (headerTitle) headerTitle.innerText = title;

    // Update Document Title (Browser Tab)
    // If title has a suffix (e.g. " - Hall of Fame"), preserve it.
    if (document.title.includes(' - ')) {
        const parts = document.title.split(' - ');
        parts[0] = title;
        document.title = parts.join(' - ');
    } else {
        document.title = title;
    }
};

if (typeof module !== 'undefined') {
    module.exports = { getThemeConfig, applyGlobalTheme, updateSiteTitle };
}

if (typeof window !== 'undefined') {
    window.getThemeConfig = getThemeConfig;
    window.applyGlobalTheme = applyGlobalTheme;
    window.updateSiteTitle = updateSiteTitle;
}