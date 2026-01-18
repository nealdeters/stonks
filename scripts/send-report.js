const { Resend } = require('resend'); //
const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Season End Logic
 */
function isSeasonOver() {
    const now = new Date();
    const currentYear = now.getFullYear();

    // 1. Find the 2nd Friday of December
    let decFridays = [];
    for (let day = 1; day <= 14; day++) {
        let d = new Date(currentYear, 11, day); // Dec is month 11
        if (d.getDay() === 5) decFridays.push(d);
    }
    const secondFridayDec = decFridays[1];

    // 2. Christmas Logic: If Dec 25 is a Friday, last run is Dec 18
    const christmas = new Date(currentYear, 11, 25);
    let seasonEnd = secondFridayDec;
    
    if (christmas.getDay() === 5) {
        // If Christmas is a Friday, the season concludes the week prior
        seasonEnd = new Date(currentYear, 11, 18);
    }

    // Return true if today is past the end date
    return now > seasonEnd;
}

async function run() {
    if (isSeasonOver()) {
        console.log("Season complete. No report sent.");
        return;
    }

    // DEBUG: Print length to check if it's empty without exposing the key
    const rawKey = process.env.RESEND_API_KEY;
    console.log("RESEND_API_KEY presence check:", !!rawKey, "Length:", rawKey ? rawKey.length : 0);

    if (!rawKey || rawKey.length < 5) {
        console.error("ERROR: RESEND_API_KEY is missing or too short.");
        process.exit(1);
    }

    // Instantiate inside the try block for better error catching
    try {
        const resend = new Resend(rawKey);
        // 1. Get recipients from Google Sheet
        const sheetId = process.env.SHEET_ID;
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=EmailList&cb=${Date.now()}`;
        const res = await axios.get(url);
        const json = JSON.parse(res.data.substring(47).slice(0, -2));
        
        // STRICTOR RECIPIENT FILTERING
        const recipients = json.table.rows
            .map(row => {
                // Get value from Column B (index 1), trim whitespace
                const email = row.c && row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : null;
                return email;
            })
            .filter(email => {
                // ONLY keep strings that have an '@' and are not the word 'Email'
                return email && 
                       email.includes('@') && 
                       email.toLowerCase() !== 'email';
            });

        console.log(`Verified Recipients Found: ${recipients.length}`);
        if (recipients.length === 0) {
            console.log("Full data dump for debugging:", JSON.stringify(json.table.rows));
            throw new Error("No valid email addresses found in Column B of EmailList tab.");
        }

        const screenshotPath = path.join(__dirname, '../icon.png');
        const screenshotData = fs.readFileSync(screenshotPath);

        // 2. Send via Resend
        const response = await resend.emails.send({
            from: 'Stonks Update <onboarding@resend.dev>',
            to: recipients, // Resend accepts an array of strings
            subject: `Stonks Weekly Update: ${new Date().toLocaleDateString()}`,
            html: `
                <div style="background-color: #020617; color: #f1f5f9; padding: 20px; font-family: sans-serif; border-radius: 15px; border: 1px solid #1e1b4b;">
                    <h1 style="color: #a78bfa; margin-bottom: 10px; font-weight: 900;">Stonks 2026</h1>
                    <p style="color: #94a3b8; line-height: 1.6;">The weekly leaderboard update is here. Attached is the current snapshot.</p>
                </div>
            `,
            attachments: [{
                filename: 'leaderboard.png',
                content: screenshotData,
            }]
        });

        if (response.error) throw new Error(response.error.message);
        console.log("Report sent successfully! ID:", response.data.id);

    } catch (err) {
        console.error("Workflow Failed:", err.message);
        process.exit(1);
    }
}

run();