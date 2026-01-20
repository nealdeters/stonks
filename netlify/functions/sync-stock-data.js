const axios = require('axios');
const { JWT } = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');
const { Redis } = require('@upstash/redis');
const { schedule } = require('@netlify/functions');
const { SHEETS, getRange, parseRows } = require('../../src/utils/helpers');

const API_BASE_URL = "https://finnhub.io/api/v1";

const fetchAllData = async (tickers, apiKey) => {
    const marketStatusReq = axios.get(`${API_BASE_URL}/stock/market-status?exchange=US&token=${apiKey}`);
    const symbolListReq = axios.get(`${API_BASE_URL}/stock/symbol?exchange=US&token=${apiKey}`);

    const priceReqs = tickers.map(t => 
        axios.get(`${API_BASE_URL}/quote?symbol=${t}&token=${apiKey}`)
    );

    const [statusRes, symbolsRes, ...priceResults] = await Promise.all([
        marketStatusReq,
        symbolListReq,
        ...priceReqs
    ]);

    const { isOpen, holiday } = statusRes.data;
    const allSymbols = symbolsRes.data; 
    
    const prices = priceResults.map((res, i) => ({
        ticker: tickers[i],
        price: res.data.c,
        dp: res.data.dp,
        name: allSymbols.find(s => s.symbol === tickers[i])?.description || 'Unknown'
    }));

    return {
        isMarketOpen: isOpen,
        holidayName: holiday,
        prices,
        allSymbols
    };
};

const handler = async (event) => {
    console.log("Starting scheduled sync...");
    const API_KEY = process.env.FINNHUB_KEY;
    const SHEET_ID = process.env.SHEET_ID;
    
    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

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
        getRange(SHEETS.WINNERS),
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
            winners: parseRows(response.data.valueRanges[6]),
        };

        sheetData.contestants.forEach(c => delete c.email);
        sheetData.users.forEach(u => delete u.email);

        const tickers = [...new Set([...sheetData.contestants.map(c => c.ticker), ...sheetData.benchmarks.map(b => b.ticker)])].filter(Boolean);

        const { isMarketOpen, prices, allSymbols } = await fetchAllData(tickers, API_KEY);

        const historicalTickers = sheetData.records.map(r => r.ticker);
        const uniqueTickers = [...new Set([...tickers, ...historicalTickers])].filter(Boolean);
        
        const stockNames = {};
        if (allSymbols) {
            uniqueTickers.forEach(t => {
                const upperT = t.toUpperCase();
                const match = allSymbols.find(s => s.symbol === upperT);
                if (match) stockNames[upperT] = match.description;
            });
        }

        const payload = { sheetData, prices, isMarketOpen, stockNames };
        
        await redis.set('STOCK_DASHBOARD_DATA', payload, { ex: 900 });

        console.log("Sync complete.");
        return { statusCode: 200 };

    } catch (err) {
        console.error("Sync Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};

exports.handler = schedule("*/10 * * * *", handler);