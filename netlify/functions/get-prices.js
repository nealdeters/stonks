const axios = require('axios');
const { JWT } = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
};

async function fetchPrivateSheetData(auth, spreadsheetId) {
    const sheets = googleSheets.sheets({ version: 'v4', auth });
    const ranges = [
        'Contestants!A:Z', 
        'Records!A:Z', 
        'Prizes!A:Z', 
        'Benchmarks!A:Z', 
        'Payment!A:Z'
    ];

    const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
    });

    const parseRows = (valueSet) => {
        if (!valueSet || !valueSet.values || valueSet.values.length === 0) return [];
        const [headers, ...rows] = valueSet.values;
        const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[\s_]/g, ''));
        return rows.map(row => {
            const obj = {};
            normalizedHeaders.forEach((h, i) => {
                obj[h] = row[i] !== undefined ? row[i] : null;
            });
            return obj;
        });
    };

    return {
        contestants: parseRows(response.data.valueRanges[0]),
        records: parseRows(response.data.valueRanges[1]),
        prizes: parseRows(response.data.valueRanges[2]),
        benchmarks: parseRows(response.data.valueRanges[3]),
        payment: parseRows(response.data.valueRanges[4])[0] || {}
    };
}

exports.handler = async (event) => {
    const API_KEY = process.env.FINNHUB_KEY;
    const SHEET_ID = process.env.SHEET_ID;
    const GOOGLE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_KEY = process.env.GOOGLE_PRIVATE_KEY;

    if (!GOOGLE_EMAIL || !GOOGLE_KEY) {
        return { 
            statusCode: 500, 
            headers: HEADERS, 
            body: JSON.stringify({ 
                error: "Config Error", 
                message: `Missing Environment Variables. Email: ${!!GOOGLE_EMAIL}, Key: ${!!GOOGLE_KEY}` 
            }) 
        };
    }

    try {
        const formattedKey = GOOGLE_KEY.replace(/\\n/g, '\n');

        const auth = new JWT({
            email: GOOGLE_EMAIL,
            key: formattedKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheetData = await fetchPrivateSheetData(auth, SHEET_ID);

        const tickers = [...new Set([
            ...sheetData.contestants.map(c => (c.ticker || '').toUpperCase()),
            ...sheetData.benchmarks.map(b => (b.ticker || '').toUpperCase())
        ])].filter(t => t.length > 0);

        const priceRequests = tickers.map(t => 
            axios.get(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${API_KEY}`)
        );
        
        const symbolListRequest = axios.get(`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${API_KEY}`);

        const [symbolListResult, ...priceResults] = await Promise.all([
            symbolListRequest,
            ...priceRequests
        ]);

        const symbolMap = new Map(
            Array.isArray(symbolListResult.data) ? symbolListResult.data.map(item => [item.symbol, item.description]) : []
        );

        const prices = tickers.map((ticker, i) => {
            const res = priceResults[i];
            return {
                ticker,
                name: symbolMap.get(ticker) || ticker,
                price: res.data?.c || 0,
                dp: res.data?.dp || 0
            };
        });

        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify({ sheetData, prices, lastUpdated: new Date().toISOString() })
        };

    } catch (err) {
        console.error("Function Execution Error:", err.message);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ 
                error: "Fetch Error", 
                message: err.message,
                hint: "Ensure the Service Account email has been shared with the Google Sheet."
            })
        };
    }
};