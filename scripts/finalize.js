const { JWT } = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');
const axios = require('axios');
const { SHEETS, getRange, isContestOver } = require('../src/utils/helpers');

async function run(injectedSheets = null) {
    const GOOGLE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    const GOOGLE_KEY = rawKey ? rawKey.replace(/\\n/g, '\n') : null;
    const API_KEY = process.env.FINNHUB_KEY;
    const sheetId = process.env.SHEET_ID;

    let sheets;
    if (injectedSheets) {
        sheets = injectedSheets;
    } else {
        const auth = new JWT({
            email: GOOGLE_EMAIL,
            key: GOOGLE_KEY,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        sheets = googleSheets.sheets({ version: 'v4', auth });
    }

    try {
        // 1. Check Date
        const controlsRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: getRange(SHEETS.CONTROLS)
        });
        const controlRows = controlsRes?.data?.values || [];
        const endDate = controlRows[1][controlRows[0].map(h => h.toLowerCase()).indexOf('end')];

        if (!endDate || !isContestOver(new Date(), endDate)) {
            console.log("Contest active. Skipping.");
            return;
        }

        // 2. Fetch Contestants
        const contestantsRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: getRange(SHEETS.CONTESTANTS)
        });
        const rows = contestantsRes?.data?.values || [];
        if (rows.length <= 1) return;

        const headers = rows[0].map(h => h.toLowerCase().trim());
        const rawData = rows.slice(1).map(row => {
            const get = (col) => row[headers.indexOf(col)] || '';
            return {
                user_uuid: get('user_uuid'),
                name: get('name'),
                ticker: get('ticker'),
                capital: parseFloat(get('capital')),
                cost: parseFloat(get('cost')),
                shares: parseFloat(get('shares'))
            };
        });

        // 3. Fetch Final Prices & Calculate Gains
        console.log("Fetching final market prices...");
        const finalResults = await Promise.all(rawData.map(async (p) => {
            // Note: In real use, this hits Finnhub. In test, it hits our mock.
            const priceRes = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${p.ticker}&token=${API_KEY}`);
            const finalPrice = priceRes.data.c;
            
            // Calculation
            const currentMarketValue = finalPrice * p.shares;
            const gainPercentage = ((currentMarketValue - p.capital) / p.capital) * 100;
            
            return { ...p, finalPrice, gainPercentage };
        }));

        // Sort by gain descending
        const sorted = finalResults.sort((a, b) => b.gainPercentage - a.gainPercentage);

        const archiveRows = sorted.map((p, index) => [
            p.user_uuid,
            p.name,
            p.ticker,
            p.capital,
            p.cost,
            p.shares,
            p.finalPrice,
            `${p.gainPercentage.toFixed(2)}%`,
            index + 1, // Place
            new Date().getFullYear().toString()
        ]);

        // 5. Append to Records
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: `${SHEETS.RECORDS}!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: archiveRows }
        });

        // 6. Clear Contestants
        await sheets.spreadsheets.values.clear({
            spreadsheetId: sheetId,
            range: `${SHEETS.CONTESTANTS}!A2:J100` 
        });

        console.log(`Finalized: ${archiveRows.length} contestants archived.`);
    } catch (err) {
        console.error("Finalization failed:", err.message);
        if (!injectedSheets) process.exit(1);
        throw err;
    }
}

if (require.main === module) {
    run().catch(() => process.exit(1));
}
module.exports = { run };