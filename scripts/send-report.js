/**
 * scripts/send-report.js
 * * Purpose: 
 * 1. Checks if the Stonks 2026 season is still active.
 * 2. Fetches the distribution list from Google Sheets.
 * 3. Finds the most recent PNG in the /screenshots folder.
 * 4. Sends the report via Resend API.
 */

const { Resend } = require('resend');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Season End Logic
 * Rules:
 * - Run every Friday until the second Friday in December 2026.
 * - If Christmas falls on a Friday, the last report is the Friday before.
 */
function isSeasonOver() {
    const now = new Date();
    const currentYear = now.getFullYear();

    // 1. Calculate the Second Friday of December
    let decFridays = [];
    for (let day = 1; day <= 14; day++) {
        let d = new Date(currentYear, 11, day); // Month is 0-indexed (11 = Dec)
        if (d.getDay() === 5) decFridays.push(d);
    }
    const secondFridayDec = decFridays[1];

    // 2. Handle Christmas Friday Rule
    const christmas = new Date(currentYear, 11, 25);
    let seasonEnd = secondFridayDec;
    
    if (christmas.getDay() === 5) {
        // If Christmas is a Friday, the season ends on the 18th
        seasonEnd = new Date(currentYear, 11, 18);
    }

    return now > seasonEnd;
}

/**
 * Helper to find the most recent PNG in a directory
 */
function getLatestScreenshot(dirPath) {
    if (!fs.existsSync(dirPath)) return null;

    const files = fs.readdirSync(dirPath)
        .filter(file => file.toLowerCase().endsWith('.png'))
        .map(file => ({
            name: file,
            path: path.join(dirPath, file),
            time: fs.statSync(path.join(dirPath, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Newest file at index 0

    return files.length > 0 ? files[0].path : null;
}

async function run() {
    // Exit if the season has concluded
    if (isSeasonOver()) {
        console.log("Stonks 2026 Season has concluded. Skipping report.");
        return;
    }

    // Verify Environment Variables
    const apiKey = process.env.RESEND_API_KEY;
    const sheetId = process.env.SHEET_ID;

    if (!apiKey) {
        console.error("ERROR: RESEND_API_KEY is missing in the environment.");
        process.exit(1);
    }
    if (!sheetId) {
        console.error("ERROR: SHEET_ID is missing in the environment.");
        process.exit(1);
    }

    console.log(`API Key Presence: true (Length: ${apiKey.length})`);

    try {
        const resend = new Resend(apiKey);

        // 1. Fetch Recipients from Google Sheet "EmailList" Tab
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=EmailList&cb=${Date.now()}`;
        const res = await axios.get(url);
        const json = JSON.parse(res.data.substring(47).slice(0, -2));
        
        const recipients = json.table.rows
            .map(row => {
                // Get value from Column B (index 1), trim whitespace
                const email = row.c && row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : null;
                return email;
            })
            .filter(email => {
                // Keep valid emails, ignore headers like 'Email'
                return email && 
                       email.includes('@') && 
                       email.toLowerCase() !== 'email';
            });

        console.log(`Verified Recipients Found: ${recipients.length}`);
        if (recipients.length === 0) throw new Error("No valid email addresses found in Google Sheet.");

        // 2. Identify the Latest Screenshot
        const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
        const latestScreenshotPath = getLatestScreenshot(screenshotsDir);
        
        if (!latestScreenshotPath) {
            throw new Error(`No PNG screenshots found in directory: ${screenshotsDir}`);
        }

        console.log(`Attaching file: ${path.basename(latestScreenshotPath)}`);
        
        // Convert Buffer to Base64 for the Resend API payload
        const screenshotBase64 = fs.readFileSync(latestScreenshotPath).toString('base64');

        // 3. Send Email via Resend
        const response = await resend.emails.send({
            from: 'Stonks Update <onboarding@resend.dev>', // Update this after domain verification
            to: recipients,
            subject: `Stonks Weekly Update: ${new Date().toLocaleDateString()}`,
            html: `
                <div style="background-color: #020617; color: #f1f5f9; padding: 30px; font-family: sans-serif; border-radius: 20px; border: 1px solid #1e1b4b; max-width: 600px; margin: auto;">
                    <h1 style="color: #a78bfa; margin-bottom: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Stonks 2026</h1>
                    <p style="color: #94a3b8; line-height: 1.6; font-size: 16px;">The weekly leaderboard update is ready. Attached is the most recent snapshot of market performance.</p>
                    <hr style="border: 0; border-top: 1px solid #1e1b4b; margin: 20px 0;" />
                    <p style="font-size: 11px; color: #475569;">Automated workflow from Algonquin, IL.</p>
                </div>
            `,
            attachments: [{
                filename: `leaderboard-${new Date().toISOString().split('T')[0]}.png`,
                content: screenshotBase64,
            }]
        });

        if (response.error) throw new Error(response.error.message);
        console.log("Report sent successfully! ID:", response.data.id);

    } catch (err) {
        console.error("Workflow Failed:", err.message);
        process.exit(1);
    }
}

// Start the process
run();