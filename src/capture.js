import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { isContestOver } from './utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkIfContestOver() {
    try {
        const response = await axios.get(`${process.env.SITE_URL}/.netlify/functions/fetch-data`);
        const { controls } = response.data.sheetData;

        if (!controls || !controls.end) return false;
        
        return isContestOver(new Date(), controls.end);
    } catch (err) {
        console.error("Could not verify contest end, proceeding with caution:", err.message);
        return false;
    }
}

export const runCapture = async () => {
    const force = process.argv.includes('--force');
    if (!force) {
        const over = await checkIfContestOver();
        if (over) {
            console.log("Contest has ended. Skipping screenshot. Use --force to override.");
            if (process.env.NODE_ENV !== 'test') process.exit(0);
            return; 
        }
    } else {
        console.log("Force flag detected. Ignoring contest end check.");
    }

    const dir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });

    const url = process.env.SITE_URL;
    if (!url) {
        console.error('Error: SITE_URL environment variable is not set. Please add it to GitHub Secrets.');
        process.exit(1);
    }
    await page.goto(url, { waitUntil: 'networkidle0' });

    await new Promise(r => setTimeout(r, 5000));

    const date = new Date().toISOString().split('T')[0];
    await page.screenshot({ path: path.join(dir, `leaderboard-${date}.png`), fullPage: true });

    await browser.close();
};

if (process.argv[1] === __filename) {
    runCapture();
}