const { Resend } = require('resend');
const { JWT } = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');
const fs = require('fs');
const path = require('path');
const { SHEETS, getRange, isContestOver } = require('../src/utils/helpers');

async function run() {
    const force = process.argv.includes('--force');
    const manualToArg = process.argv.find(arg => arg.startsWith('--to='));
    let recipients = [];

    if (manualToArg) {
        recipients = manualToArg.split('=')[1].split(',').map(e => e.trim()).filter(e => e.includes('@'));
        console.log("Using manual recipient list:", recipients);
    }

    const apiKey = process.env.RESEND_API_KEY;
    const sheetId = process.env.SHEET_ID;
    const GOOGLE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    const auth = new JWT({
        email: GOOGLE_EMAIL,
        key: GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = googleSheets.sheets({ version: 'v4', auth });
    const resend = new Resend(apiKey);

    try {
        const controlsRes = await sheets.spreadsheets.values.get({ 
            spreadsheetId: sheetId, 
            range: getRange(SHEETS.CONTROLS)
        });
        const controlRows = controlsRes.data.values || [];
        const headersControl = controlRows[0];
        const valuesControl = controlRows[1];
        const controls = Object.fromEntries(headersControl.map((h, i) => [h.toLowerCase(), valuesControl[i]]));

        if (!force && isContestOver(new Date(), controls.end)) {
            console.log("Contest concluded. Skipping. Use --force to override.");
            return;
        }

        if (recipients.length === 0) {
            const contestantsRes = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: getRange(SHEETS.CONTESTANTS)
            });
            const rows = contestantsRes.data.values || [];
            const headers = rows[0].map(h => h.toLowerCase().trim());
            const emailIdx = headers.indexOf('email');

            recipients = rows.slice(1)
                .map(row => row[emailIdx])
                .filter(email => email && email.includes('@'));
        }

        if (recipients.length === 0) throw new Error("No recipients found.");

        const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
        const files = fs.readdirSync(screenshotsDir)
            .filter(f => f.endsWith('.png'))
            .map(f => ({ 
                name: f, 
                time: fs.statSync(path.join(screenshotsDir, f)).mtime.getTime() 
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length === 0) throw new Error("No screenshots found.");
        const screenshotPath = path.join(screenshotsDir, files[0].name);
        const screenshotBase64 = fs.readFileSync(screenshotPath).toString('base64');
        const title = controls.title || 'Stonks';

        await resend.emails.send({
            from: `${title} <onboarding@resend.dev>`,
            to: recipients,
            subject: `${title} Weekly Update: ${new Date().toLocaleDateString()}`,
            html: `
                <div style="font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 12px;">
                    <h1 style="color: #a78bfa;">${title} Leaderboard</h1>
                    <p style="font-size: 16px; color: #94a3b8;">The latest standings are in! See the attached screenshot.</p>
                </div>`,
            attachments: [{ filename: files[0].name, content: screenshotBase64 }]
        });

        console.log(`Report sent to ${recipients.length} recipients.`);
    } catch (err) {
        console.error("Script failed:", err.message);
        if (require.main === module) {
            process.exit(1);
        } else {
            throw err; // Re-throw so the test runner sees the actual error
        }
    }
}

if (require.main === module) {
    run();
}
module.exports = { run }; // Export for testing