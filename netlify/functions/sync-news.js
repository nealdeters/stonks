const axios = require('axios');
const { JWT } = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');
const { Redis } = require('@upstash/redis');
const { schedule } = require('@netlify/functions');
const { SHEETS, getRange, parseRows } = require('../../src/utils/helpers');

const API_BASE_URL = "https://finnhub.io/api/v1";

const fetchNews = async (tickers, apiKey) => {
    const to = new Date().toISOString().split('T')[0];
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 3);
    const from = fromDate.toISOString().split('T')[0];

    const uniqueTickers = [...new Set(tickers)].filter(Boolean).slice(0, 15);

    const newsReqs = uniqueTickers.map(t => 
        axios.get(`${API_BASE_URL}/company-news?symbol=${t}&from=${from}&to=${to}&token=${apiKey}`)
            .catch(e => ({ data: [] }))
    );

    const results = await Promise.all(newsReqs);
    return results.flatMap((r, i) => r.data.map(n => ({ ...n, ticker: uniqueTickers[i] }))).sort((a, b) => b.datetime - a.datetime);
};

const handler = async (event) => {
    console.log("Starting news sync...");
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

    try {
        const sheets = googleSheets.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: SHEET_ID,
            ranges: [getRange(SHEETS.CONTESTANTS), getRange(SHEETS.CONTROLS)],
        });
        
        const contestants = parseRows(response.data.valueRanges[0]);
        const controls = parseRows(response.data.valueRanges[1])[0] || {};
        const tickers = contestants.map(c => c.ticker).filter(Boolean);

        const news = await fetchNews(tickers, API_KEY);
        
        await redis.set('STOCK_NEWS_DATA', { news, controls, lastUpdated: Date.now() }, { ex: 3600 });

        console.log(`News sync complete. Found ${news.length} articles.`);
        return { statusCode: 200 };

    } catch (err) {
        console.error("News Sync Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};

exports.handler = schedule("*/30 * * * *", handler);