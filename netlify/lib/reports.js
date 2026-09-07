import { isContestOver, getRange, parseRows, SHEETS } from '../../src/utils/helpers.js';
import * as puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium'
import { Resend } from 'resend';
import { getSheetsClient, validateGoogleEnvVars } from './auth.js';

/**
 * Resolve Resend `from` address.
 * Prefer env RESEND_FROM:
 *   - full string: `Schultz Cup Report <reports@schultzcup.com>`
 *   - or just an email: `reports@schultzcup.com` (wrapped with `${title} Report <…>`)
 * If unset, falls back to testing-only `reports@resend.dev` (same title pattern).
 * Production: verify the domain in Resend and set RESEND_FROM on each Netlify site.
 */
export const resolveResendFrom = (title) => {
    const envFrom = (process.env.RESEND_FROM || '').trim();
    if (!envFrom) {
        console.warn(
            'RESEND_FROM is unset; using testing-only reports@resend.dev. ' +
            'Verify your domain in Resend and set RESEND_FROM on the Netlify site for production.'
        );
        return `${title} Report <reports@resend.dev>`;
    }
    if (envFrom.includes('<') && envFrom.includes('>')) {
        return envFrom;
    }
    return `${title} Report <${envFrom}>`;
};

const formatResendError = (err) => {
    if (err == null) return String(err);
    if (typeof err === 'string') return err;
    try {
        return JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
    } catch {
        return String(err);
    }
};

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
        const from = resolveResendFrom(title);

        console.log('Sending report from', from, 'to', recipients.join(', '));
        try {
            const sendResult = await Promise.race([
                resend.emails.send({
                    from,
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

            // Resend SDK v2 returns { data, error } instead of throwing on API failures (e.g. 403).
            const apiError = sendResult?.error;
            if (apiError) {
                console.error('Resend API failure — full error body:', formatResendError(apiError));
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: apiError.message || apiError.error || 'Resend API error',
                        resend: apiError,
                    }),
                };
            }

            console.log('Report send succeeded', sendResult?.data ? { id: sendResult.data.id } : '');
            return { statusCode: 200, body: `Report sent to ${recipients.join(', ')}` };
        } catch (err) {
            console.error('Report send failed — full error body:', formatResendError(err));
            return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
        }

    } catch (error) {
        console.error("Report generation failed:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
