import { schedule } from '@netlify/functions';
import axios from 'axios';
import { JWT } from 'google-auth-library';
import googleSheetsPkg from '@googleapis/sheets';
import { Redis } from '@upstash/redis';
import { SHEETS, getRange, parseRows } from '../../src/utils/helpers.js';

const googleSheets = googleSheetsPkg.default || googleSheetsPkg;

export const syncNews = async (event) => {
    console.log("Starting news sync...");
    
    try {
        const API_BASE_URL = "https://finnhub.io/api/v1";
        const API_KEY = process.env.FINNHUB_KEY;
        const SHEET_ID = process.env.SHEET_ID;

        const fetchNews = async (tickers, apiKey) => {
            const to = new Date().toISOString().split('T')[0];
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 3);
            const from = fromDate.toISOString().split('T')[0];

            const uniqueTickers = [...new Set(tickers)].filter(Boolean).slice(0, 15);

            const newsReqs = uniqueTickers.map(t => 
                axios.get(`${API_BASE_URL}/company-news?symbol=${t}&from=${from}&to=${to}&token=${apiKey}`, { timeout: 8000 })
                    .catch(e => ({ data: [] }))
            );

            const results = await Promise.all(newsReqs);
            return results.flatMap((r, i) => r.data.map(n => ({ ...n, ticker: uniqueTickers[i] }))).sort((a, b) => b.datetime - a.datetime);
        };

        if (!process.env.GOOGLE_PRIVATE_KEY) throw new Error("Missing GOOGLE_PRIVATE_KEY");
        if (!process.env.UPSTASH_REDIS_REST_URL) throw new Error("Missing UPSTASH_REDIS_REST_URL");

        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

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
        return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
    }
};

export const handler = schedule("*/30 * * * *", syncNews);