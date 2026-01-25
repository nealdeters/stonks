import axios from 'axios';
import { JWT } from 'google-auth-library';
import googleSheetsPkg from '@googleapis/sheets';
import { SHEETS, getRange, parseRows } from '../../src/utils/helpers.js';

const googleSheets = googleSheetsPkg.default || googleSheetsPkg;

export const updateBenchmarks = async (event) => {
    const force = event.queryStringParameters?.force === 'true';
    console.log(`Starting benchmark update... (Force: ${force})`);
    
    try {
        const SHEET_ID = process.env.SHEET_ID;
        const API_KEY = process.env.FINNHUB_KEY;
        
        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = googleSheets.sheets({ version: 'v4', auth });

        // 1. Get Controls to check date
        const controlsRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: getRange(SHEETS.CONTROLS),
        });
        const controlsRows = parseRows(controlsRes.data);
        const controls = controlsRows[0] || {};

        if (!controls.cutoff) {
            console.log("No cutoff date set.");
            return { statusCode: 200, body: "No cutoff date set" };
        }

        if (!force) {
            const today = new Date().toISOString().split('T')[0];
            const cutoff = new Date(controls.cutoff).toISOString().split('T')[0];
            
            if (today !== cutoff) {
                console.log(`Today (${today}) is not the cutoff date (${cutoff}). Skipping.`);
                return { statusCode: 200, body: "Skipped: Not cutoff date" };
            }
        }

        // 2. Get Benchmarks
        const benchRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: getRange(SHEETS.BENCHMARKS),
        });
        
        const benchmarks = benchRes.data.values;
        if (!benchmarks || benchmarks.length < 2) {
            console.log("No benchmarks found.");
            return { statusCode: 200, body: "No benchmarks found" };
        }

        const headers = benchmarks[0].map(h => h.toLowerCase());
        const tickerIdx = headers.indexOf('ticker');
        const priceIdx = headers.indexOf('price');

        if (tickerIdx === -1 || priceIdx === -1) {
            console.error("Invalid Benchmark headers");
            return { statusCode: 500, body: "Invalid Benchmark headers" };
        }

        // 3. Update Prices
        const updates = benchmarks.slice(1).map(async (row) => {
            const ticker = row[tickerIdx];
            if (!ticker) return row;

            try {
                const quote = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${ticker.toUpperCase()}&token=${API_KEY}`);
                if (quote.data.c) {
                    while (row.length <= priceIdx) row.push('');
                    row[priceIdx] = quote.data.c;
                }
            } catch (e) {
                console.error(`Failed to fetch ${ticker}`, e.message);
            }
            return row;
        });

        const updatedRows = await Promise.all(updates);
        const newValues = [benchmarks[0], ...updatedRows];

        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: getRange(SHEETS.BENCHMARKS),
            valueInputOption: 'USER_ENTERED',
            resource: { values: newValues }
        });

        return { statusCode: 200, body: "Benchmarks updated" };
    } catch (err) {
        console.error("Benchmark Update Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};