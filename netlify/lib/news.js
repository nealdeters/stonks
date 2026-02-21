import { Redis } from '@upstash/redis';
import { SHEETS, getRange, parseRows } from '../../src/utils/helpers.js';
import FinnhubAdapter from './adapters/finnhub-adapter.js';
import { getSheetsClient, validateGoogleEnvVars } from './auth.js';

export const syncNews = async (event) => {
    console.log("Starting news sync...");
    
    try {
        const API_KEY = process.env.FINNHUB_KEY;

        if (!API_KEY) {
            throw new Error("FINNHUB_KEY is required for news");
        }

        const finnhub = new FinnhubAdapter({ apiKey: API_KEY });

        const to = new Date().toISOString().split('T')[0];
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 3);
        const from = fromDate.toISOString().split('T')[0];

        if (!process.env.UPSTASH_REDIS_REST_URL) throw new Error("Missing UPSTASH_REDIS_REST_URL");

        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        validateGoogleEnvVars();
        const sheets = await getSheetsClient();
        
        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: process.env.SHEET_ID,
            ranges: [getRange(SHEETS.CONTESTANTS), getRange(SHEETS.CONTROLS)],
        });
        
        const contestants = parseRows(response.data.valueRanges[0]);
        const controls = parseRows(response.data.valueRanges[1])[0] || {};
        const uniqueTickers = [...new Set(contestants.map(c => c.ticker).filter(Boolean))].slice(0, 15);

        // Fetch news using Finnhub adapter
        const newsResults = [];
        for (const ticker of uniqueTickers) {
            try {
                const articles = await finnhub.getCompanyNews(ticker, from, to);
                if (articles.length > 0) {
                    newsResults.push(...articles.map(a => ({ ...a, ticker })));
                }
            } catch (e) {
                console.warn(`[News] Failed to get news for ${ticker}:`, e.message);
            }
        }

        const news = newsResults
            .sort((a, b) => b.datetime - a.datetime)
            .slice(0, 100);
        
        await redis.set('STOCK_NEWS_DATA', { news, controls, lastUpdated: Date.now() }, { ex: 3600 });

        console.log(`News sync complete. Found ${news.length} articles.`);
        return { statusCode: 200, body: "News sync complete" };

    } catch (err) {
        console.error("News Sync Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
    }
};