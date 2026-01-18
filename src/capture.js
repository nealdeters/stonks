const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    // 1. Setup paths
    const dir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    // 2. Launch Browser
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set a nice desktop viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // 3. Navigate to your site (Replace with your actual Netlify URL)
    const url = process.env.SITE_URL;
    if (!url) {
        console.error('Error: SITE_URL environment variable is not set. Please add it to GitHub Secrets.');
        process.exit(1);
    }
    await page.goto(url, { waitUntil: 'networkidle0' });

    // 4. Wait for animations/data (Stonks app takes a moment to fetch prices)
    await new Promise(r => setTimeout(r, 5000));

    // 5. Snap and Save
    const date = new Date().toISOString().split('T')[0];
    await page.screenshot({ path: path.join(dir, `leaderboard-${date}.png`), fullPage: true });

    await browser.close();
})();