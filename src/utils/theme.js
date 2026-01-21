const getThemeConfig = () => {
    const month = new Date().getMonth();
    const isDecember = month === 11;
    const isNovember = month === 10;
    const isSummer = [5, 6, 7].includes(month);

    let color = isDecember ? 'emerald' : 'indigo';
    let icon = isDecember ? '🎄' : (isNovember ? '🦃' : '🏁');
    let topMoverIcon = isDecember ? '🎁' : (isNovember ? '🍂' : (isSummer ? '🏖️' : '🚀'));

    return {
        isDecember,
        isNovember,
        isSummer,
        color,
        icon,
        topMoverIcon
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
                img.classList.add('rounded-2xl');
            });

            const topMoverIconEl = document.getElementById('top-mover-icon');
            if (topMoverIconEl) topMoverIconEl.innerText = theme.topMoverIcon;

            if (theme.color !== 'indigo') {
                const replaceColor = (str) => str ? str.replace(/indigo/g, theme.color) : str;
            
                if (document.body) document.body.className = replaceColor(document.body.className);
                
                const header = document.querySelector('header');
                if (header) header.className = replaceColor(header.className);
                
                document.querySelectorAll('[class*="indigo"]').forEach(el => {
                    el.className = replaceColor(el.className);
                });
            }

            if (theme.isDecember) {
                const iconLink = document.querySelector("link[rel~='icon']");
                if (iconLink) iconLink.href = '/icon-dec-512.png';

                const appleIcon = document.querySelector("link[rel='apple-touch-icon']");
                if (appleIcon) appleIcon.href = '/icon-dec-512.png';

                document.querySelectorAll('img[src*="icon.png"]').forEach(img => {
                    img.src = '/icon-dec-512.png';
                });
            }

            if (theme.isNovember) {
                const iconLink = document.querySelector("link[rel~='icon']");
                if (iconLink) iconLink.href = '/icon-nov.png';

                const appleIcon = document.querySelector("link[rel='apple-touch-icon']");
                if (appleIcon) appleIcon.href = '/icon-nov.png';

                document.querySelectorAll('img[src*="icon.png"]').forEach(img => {
                    img.src = '/icon-nov.png';
                });
            }

            if (theme.isSummer) {
                const iconLink = document.querySelector("link[rel~='icon']");
                if (iconLink) iconLink.href = '/icon-summer-512.png';

                const appleIcon = document.querySelector("link[rel='apple-touch-icon']");
                if (appleIcon) appleIcon.href = '/icon-summer-512.png';

                document.querySelectorAll('img[src*="icon.png"]').forEach(img => {
                    img.src = '/icon-summer-512.png';
                });
            }
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

    const headerTitle = document.querySelector('header h1');
    if (headerTitle) headerTitle.innerText = title;

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