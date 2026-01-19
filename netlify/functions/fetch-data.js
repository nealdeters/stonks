const axios = require('axios');
const { JWT } = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');
const { SHEETS, getRange, parseRows } = require('../../src/utils/helpers');

const HEADERS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

exports.handler = async () => {
    const API_KEY = process.env.FINNHUB_KEY;
    const SHEET_ID = process.env.SHEET_ID;
    const auth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const ranges = [
        getRange(SHEETS.CONTESTANTS),
        getRange(SHEETS.BENCHMARKS),
        getRange(SHEETS.CONTROLS),
        getRange(SHEETS.USERS),
        getRange(SHEETS.PRIZES),
        getRange(SHEETS.RECORDS),
    ];

    try {
        const sheets = googleSheets.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: SHEET_ID,
            ranges,
        });

        const sheetData = {
            contestants: parseRows(response.data.valueRanges[0]),
            benchmarks: parseRows(response.data.valueRanges[1]),
            controls: parseRows(response.data.valueRanges[2])[0] || {},
            users: parseRows(response.data.valueRanges[3]),
            prizes: parseRows(response.data.valueRanges[4]),
            records: parseRows(response.data.valueRanges[5]),
        };

        const tickers = [...new Set([...sheetData.contestants.map(c => c.ticker), ...sheetData.benchmarks.map(b => b.ticker)])].filter(Boolean);

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

        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ sheetData, prices }) };
    } catch (err) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
    }
};