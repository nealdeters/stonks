const { Resend } = require('resend');
const { JWT } = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');
const { SHEETS, getRange, isRegistrationClosed } = require('../src/utils/helpers');

async function run() {
    const force = process.argv.includes('--force');
    const manualToArg = process.argv.find(arg => arg.startsWith('--to='));
    
    const apiKey = process.env.RESEND_API_KEY;
    const sheetId = process.env.SHEET_ID;
    const auth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = googleSheets.sheets({ version: 'v4', auth });
    const resend = new Resend(apiKey);

    try {
        // 1. Get Controls (Title, Cutoff, Payment URL)
        const controlsRes = await sheets.spreadsheets.values.get({ 
            spreadsheetId: sheetId, range: getRange(SHEETS.CONTROLS) 
        });
        const controlRows = controlsRes.data.values || [];
        const headersControl = controlRows[0];
        const valuesControl = controlRows[1];
        const controls = Object.fromEntries(headersControl.map((h, i) => [h.toLowerCase(), valuesControl[i]]));

        if (!force && isRegistrationClosed(new Date(), controls.cutoff)) {
            console.log("Registration is closed. Use --force to send anyway.");
            return;
        }

        const ranges = [getRange(SHEETS.USERS), getRange(SHEETS.CONTESTANTS)]
        let recipients = [];

        // 2. Handle Manual Override vs. Smart List
        if (manualToArg) {
            recipients = manualToArg.split('=')[1].split(',').map(e => e.trim());
        } else {
            const data = await sheets.spreadsheets.values.batchGet({
                spreadsheetId: sheetId,
                ranges: ranges,
            });

            const allUsers = data.data.valueRanges[0].values || [];
            const currentContestants = data.data.valueRanges[1].values || [];

            const userHeaders = allUsers[0].map(h => h.toLowerCase().trim());
            const emailIdx = userHeaders.indexOf('email');

            // Get emails of people who already registered this year
            const registeredEmails = new Set(
                currentContestants.slice(1).map(row => row[2]?.toLowerCase()) // Assuming col C is email
            );

            // Filter Users to only those NOT in Contestants
            recipients = allUsers.slice(1)
                .map(row => row[emailIdx])
                .filter(email => email && !registeredEmails.has(email.toLowerCase()));
        }

        if (recipients.length === 0) {
            console.log("No pending users found to remind.");
            return;
        }

        const title = controls.title || 'Schultz Cup';
        const currentYear = new Date().getFullYear();
        
        // 3. Send Email
        await resend.emails.send({
            from: `${title} <onboarding@resend.dev>`,
            to: recipients,
            subject: `Action Required: Register for the ${title} ${currentYear}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #1e293b; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #a78bfa;">The ${title} is back!</h2>
                    <p>We noticed you haven't submitted your entry for this year's contest yet.</p>
                    <p><strong>Registration Cutoff:</strong> ${controls.cutoff}</p>
                    <div style="margin: 30px 0;">
                        <a href="${process.env.SITE_URL}" style="background: #a78bfa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Enter Now</a>
                    </div>
                    <p style="font-size: 12px; color: #64748b;">If you've already registered in the last few minutes, please ignore this email.</p>
                </div>`
        });

        console.log(`Reminder sent to ${recipients.length} pending users.`);
    } catch (err) {
        console.error("Reminder script failed:", err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    run();
}
module.exports = { run }; // Export for testing