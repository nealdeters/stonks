import { Resend } from 'resend';
import { SHEETS, getRange, isRegistrationClosed } from '../../src/utils/helpers.js';
import { getSheetsClient, validateGoogleEnvVars } from './auth.js';

export const sendReminder = async (event) => {
    const force = event.queryStringParameters?.force === 'true';
    const manualTo = event.queryStringParameters?.to;
    
    try {
        const API_KEY = process.env.RESEND_API_KEY;

        if (!API_KEY) {
            return { statusCode: 500, body: "Missing RESEND_API_KEY" };
        }

        validateGoogleEnvVars();
        const sheets = await getSheetsClient();
        const resend = new Resend(API_KEY);

        const controlsRes = await sheets.spreadsheets.values.get({ 
            spreadsheetId: process.env.SHEET_ID, range: getRange(SHEETS.CONTROLS) 
        });
        const controlRows = controlsRes.data.values || [];
        const headersControl = controlRows[0];
        const valuesControl = controlRows[1];
        const controls = Object.fromEntries(headersControl.map((h, i) => [h.toLowerCase(), valuesControl[i]]));

        if (!force && isRegistrationClosed(new Date(), controls.cutoff)) {
            return { statusCode: 200, body: "Registration closed" };
        }

        let recipients = [];

        if (manualTo) {
            recipients = manualTo.split(',').map(e => e.trim());
        } else {
            const ranges = [getRange(SHEETS.USERS), getRange(SHEETS.CONTESTANTS)]
            const data = await sheets.spreadsheets.values.batchGet({
                spreadsheetId: process.env.SHEET_ID,
                ranges: ranges,
            });

            const allUsers = data.data.valueRanges[0].values || [];
            const currentContestants = data.data.valueRanges[1].values || [];

            const userHeaders = allUsers[0].map(h => h.toLowerCase().trim());
            const emailIdx = userHeaders.indexOf('email');

            const registeredEmails = new Set(
                currentContestants.slice(1).map(row => row[2]?.toLowerCase())
            );

            recipients = allUsers.slice(1)
                .map(row => row[emailIdx])
                .filter(email => email && !registeredEmails.has(email.toLowerCase()));
        }

        if (recipients.length === 0) {
            return { statusCode: 200, body: "No pending users" };
        }

        const title = controls.title || 'Stonks Contest';
        const currentYear = new Date().getFullYear();
        
        await resend.emails.send({
            from: `${title} <onboarding@resend.dev>`,
            to: recipients,
            subject: `Register for the ${title} ${currentYear}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #1e293b; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #a78bfa;">The ${title} is back!</h2>
                    <p>We noticed you haven't submitted your entry for this year's contest yet.</p>
                    <p><strong>Registration Cutoff:</strong> ${controls.cutoff}</p>
                    <p><strong>Access Secret:</strong> ${process.env.APP_SECRET}</p>
                    <div style="margin: 30px 0;">
                        <a href="${process.env.SITE_URL}" style="background: #a78bfa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Enter Now</a>
                    </div>
                </div>`
        });

        return { statusCode: 200, body: `Reminders sent to ${recipients.length} users` };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};