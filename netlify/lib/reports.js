import { isContestOver, getRange, parseRows, SHEETS } from '../../src/utils/helpers.js';
import * as puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium'
import { Resend } from 'resend';
import { getSheetsClient, validateGoogleEnvVars } from './auth.js';

export const sendReport = async (event) => {
    // 1. Extract the params you need
    const force = event.queryStringParameters?.force === 'true';
    const manualTo = event.queryStringParameters?.to;
    const isLocal = process.env.NETLIFY_DEV === 'true';

    console.log(`Starting report generation... (Force: ${force}, ManualTo: ${manualTo})`);

    try {
        console.log('Fetching contestants and controls directly from Google Sheets...');
        validateGoogleEnvVars();
        const sheets = await getSheetsClient();
        const ranges = [getRange(SHEETS.CONTESTANTS), getRange(SHEETS.CONTROLS)];
        const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId: process.env.SHEET_ID, ranges });
        const contestants = parseRows(response.data.valueRanges[0]);
        const controls = parseRows(response.data.valueRanges[1])[0] || {};

        if (controls?.end && isContestOver(new Date(), controls.end)) {
            console.log('Contest ended. Skipping report.');
            return { statusCode: 200, body: 'Contest ended' };
        }

        let browser;
        let screenshotBuffer;

        try {
            console.log('Launching browser...');
            if (isLocal) {
                browser = await puppeteer.launch({
                    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                    headless: 'new',
                });
            } else {
                const chrome = chromium && (chromium.default || chromium);
                browser = await puppeteer.launch({
                    args: chrome?.args || [],
                    executablePath: chrome?.executablePath ? await chrome.executablePath() : undefined,
                    headless: chrome?.headless ?? 'new',
                });
            }
            console.log('Browser launched');

            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            console.log('Navigating to site for screenshot...');
            // use a sensible timeout and less-strict idle condition to avoid hanging
            await page.goto(process.env.SITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
            console.log('Page loaded');
            await new Promise(r => setTimeout(r, 1500));

            console.log('Capturing screenshot...');
            screenshotBuffer = await page.screenshot({ fullPage: true });
            console.log('Screenshot captured');
        } finally {
            if (browser) {
                try { await browser.close(); console.log('Browser closed'); } catch (err) { console.warn('Error closing browser', err); }
            }
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        // format date as MM-DD-YYYY
        const _d = new Date();
        const dateStr = `${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}-${_d.getFullYear()}`;

        const recipients = manualTo
            ? manualTo.split(',').map(e => e.trim()).filter(Boolean)
            : (contestants || []).map(c => c.email).filter(Boolean);

        console.log('Recipients:', recipients);
        if (!recipients[0]) {
            console.error('No recipients defined; aborting send');
            return { statusCode: 500, body: 'No recipients defined' };
        }

        const title = controls?.title || 'Stonks';

        console.log('Sending report to', recipients.join(', '));
        try {
            await Promise.race([
                resend.emails.send({
                    from: `${title} Report <reports@resend.dev>`,
                    to: recipients,
                    subject: `${title} Leaderboard Report - ${dateStr}`,
                    html: `
                        <p>Here is the latest leaderboard snapshot for <strong>${dateStr}</strong>.</p>
                        <img src="cid:leaderboard" style="width: 100%; max-width: 800px; border: 1px solid #eee;" />
                    `,
                    attachments: [
                        {
                            filename: `leaderboard-${dateStr}.png`,
                            content: screenshotBuffer,
                            cid: 'leaderboard'
                        },
                    ],
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Resend timeout')), 20000))
            ]);

            console.log('Report send succeeded');
            return { statusCode: 200, body: `Report sent to ${recipients.join(', ')}` };
        } catch (err) {
            console.error('Report send failed', err);
            return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
        }

    } catch (error) {
        console.error("Report generation failed:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};