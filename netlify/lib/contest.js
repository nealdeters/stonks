import axios from 'axios';
import { SHEETS, getRange, parseRows } from '../../src/utils/helpers.js';
import { getSheetsClient, validateGoogleEnvVars } from './auth.js';

export const finalizeContest = async (event) => {
    const force = event.queryStringParameters?.force === 'true';
    console.log(`Checking for contest finalization... (Force: ${force})`);
    
    try {
        validateGoogleEnvVars();
        const sheets = await getSheetsClient();

        const controlsRes = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: getRange(SHEETS.CONTROLS),
        });
        
        const controls = parseRows(controlsRes.data)[0];
        if (!controls || !controls.end) {
            return { statusCode: 200, body: "No end date found" };
        }

        if (!force) {
            const endDate = new Date(controls.end);
            const today = new Date();
            endDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);

            if (today < endDate) {
                return { statusCode: 200, body: "Contest still active" };
            }
        }

        const contestantsRes = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: getRange(SHEETS.CONTESTANTS)
        });
        const contestants = parseRows(contestantsRes.data);

        if (contestants.length === 0) {
            return { statusCode: 200, body: "No contestants to archive" };
        }

        console.log(`Fetching final market prices for ${contestants.length} contestants...`);
        
        const finalResults = await Promise.all(contestants.map(async (p) => {
            let finalPrice = 0;
            try {
                const priceRes = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${p.ticker}&token=${API_KEY}`);
                finalPrice = priceRes.data.c || 0;
            } catch (err) {
                console.error(`Failed to fetch price for ${p.ticker}: ${err.message}`);
            }
            
            const capital = parseFloat(p.capital) || 0;
            const shares = parseFloat(p.shares) || 0;
            const currentMarketValue = finalPrice * shares;
            const gainPercentage = capital > 0 ? ((currentMarketValue - capital) / capital) * 100 : 0;
            
            return { ...p, finalPrice, gainPercentage, capital, cost: parseFloat(p.cost), shares };
        }));

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
            index + 1,
            new Date().getFullYear().toString()
        ]);

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.SHEET_ID,
            range: getRange(SHEETS.RECORDS),
            valueInputOption: 'USER_ENTERED',
            resource: { values: archiveRows }
        });

        await sheets.spreadsheets.values.clear({
            spreadsheetId: process.env.SHEET_ID,
            range: `${SHEETS.CONTESTANTS}!A2:Z` 
        });

        return { statusCode: 200, body: `Finalized: ${archiveRows.length} contestants archived.` };

    } catch (err) {
        console.error("Finalize Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};