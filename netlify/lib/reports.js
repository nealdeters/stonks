import { isContestOver } from '../../src/utils/helpers.js';
import axios from 'axios';
import * as puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium'
import { Resend } from 'resend';

export const sendReport = async (event) => {
    // 1. Extract the params you need
    const force = event.queryStringParameters?.force === 'true';
    const manualTo = event.queryStringParameters?.to;
    const isLocal = process.env.NETLIFY_DEV === 'true';

    console.log(`Starting report generation... (Force: ${force}, ManualTo: ${manualTo})`);

    try {
        const response = await axios.get(`${process.env.SITE_URL}/.netlify/functions/fetch-data`);
        const sheetData = response.data.sheetData;
        if (sheetData?.controls?.end && isContestOver(new Date(), sheetData.controls.end)) {
            console.log("Contest ended. Skipping report.");
            return { statusCode: 200, body: "Contest ended" };
        }

        let browser;

        if (isLocal) {
            browser = await puppeteer.launch({
                executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                headless: true,
            });
        } else {
            const chrome = chromium && (chromium.default || chromium);
            browser = await puppeteer.launch({
                args: chrome?.args || [],
                executablePath: chrome?.executablePath ? await chrome.executablePath() : undefined,
                headless: chrome?.headless ?? true,
            });
        }

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(process.env.SITE_URL, { waitUntil: 'networkidle0' });
        
        await new Promise(r => setTimeout(r, 3000));

        const screenshotBuffer = await page.screenshot({ fullPage: true });
        await browser.close();

        const resend = new Resend(process.env.RESEND_API_KEY);
        const dateStr = new Date().toISOString().split('T')[0];
        
        const recipients = manualTo ? manualTo.split(',').map(e => e.trim()) : sheetData?.contestants?.map(c => c.email) || [];

        if (!recipients[0]) {
            return { statusCode: 500, body: "No recipients defined" };
        }

        const title = sheetData?.controls?.title || "Stonks";

        await resend.emails.send({
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
        });

        return { statusCode: 200, body: `Report sent to ${recipients.join(', ')}` };

    } catch (error) {
        console.error("Report generation failed:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};