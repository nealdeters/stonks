const initSubmit = () => {
    applyGlobalTheme();

    // Fetch data to update title if custom controls exist
    fetch("/.netlify/functions/fetch-data")
        .then(response => response.json())
        .then(data => {
            const controls = data.sheetData?.controls || data.controls;
            if (controls?.title) updateSiteTitle(controls.title);
        })
        .catch(() => {}); // Silent fail is fine here

    const entryForm = document.getElementById('entryForm');
    if (entryForm) {
        entryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-btn');
            const errEl = document.getElementById('error-message');
            const formData = new FormData(e.target);
            
            btn.disabled = true;
            const originalText = btn.innerText;
            btn.innerText = "Processing...";
            errEl.classList.add('hidden');

            try {
                const response = await fetch("/.netlify/functions/process-entry", {
                    method: "POST",
                    body: new URLSearchParams(formData).toString(),
                    headers: { "Content-Type": "application/x-www-form-urlencoded" }
                });

                const result = await response.json();

                if (response.ok) {
                    window.location.href = "/?submitted=true";
                } else {
                    throw new Error(result.error || "System Error");
                }
            } catch (error) {
                btn.disabled = false;
                btn.innerText = originalText;
                errEl.innerText = error.message;
                errEl.classList.remove('hidden');
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', initSubmit);

// Tailwind Safelist for Submit Page
const _safelist = `
    bg-emerald-950/30 border-emerald-500/30 border-emerald-500/40 
    shadow-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5
    bg-emerald-500/5 border-emerald-500/10 text-emerald-400
    bg-orange-950/30 border-orange-500/30 border-orange-500/40 
    shadow-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/5
    bg-orange-500/5 border-orange-500/10 text-orange-400
`;