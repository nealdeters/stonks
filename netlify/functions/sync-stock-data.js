import { schedule } from '@netlify/functions';
import axios from 'axios';
import { JWT } from 'google-auth-library';
import googleSheetsPkg from '@googleapis/sheets';
import { Redis } from '@upstash/redis';
import { SHEETS, getRange, parseRows } from '../../src/utils/helpers.js';

const googleSheets = googleSheetsPkg.default || googleSheetsPkg;

export const syncStockData = async (event) => {
    console.log("Starting scheduled sync...");
    
    try {
        const API_BASE_URL = "https://finnhub.io/api/v1";
        const API_KEY = process.env.FINNHUB_KEY;
        const SHEET_ID = process.env.SHEET_ID;

        const fetchAllData = async (tickers, apiKey) => {
            const config = { timeout: 8000 }; // 8s timeout to prevent Lambda kill
            const marketStatusReq = axios.get(`${API_BASE_URL}/stock/market-status?exchange=US&token=${apiKey}`, config);
            const symbolListReq = axios.get(`${API_BASE_URL}/stock/symbol?exchange=US&token=${apiKey}`, config);

            const priceReqs = tickers.map(t => 
                axios.get(`${API_BASE_URL}/quote?symbol=${t}&token=${apiKey}`, config)
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

        const deriveWinners = (records) => {
            const winnersMap = {};
            records.forEach(record => {
                const year = record.year;
                if (!year) return;
                
                if (!winnersMap[year]) winnersMap[year] = { year };
                
                const place = parseInt(record.place);
                if (place === 1) {
                    winnersMap[year].first_user_name = record.name;
                    winnersMap[year].first_user_uuid = record.user_uuid;
                    winnersMap[year].ticker = record.ticker;
                    winnersMap[year].return = record.percent_gain;
                } else if (place === 2) {
                    winnersMap[year].second_user_name = record.name;
                    winnersMap[year].second_user_uuid = record.user_uuid;
                } else if (place === 3) {
                    winnersMap[year].third_user_name = record.name;
                    winnersMap[year].third_user_uuid = record.user_uuid;
                }
            });
            return Object.values(winnersMap).sort((a, b) => b.year - a.year);
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

        const ranges = [
            getRange(SHEETS.CONTESTANTS),
            getRange(SHEETS.BENCHMARKS),
            getRange(SHEETS.CONTROLS),
            getRange(SHEETS.USERS),
            getRange(SHEETS.PRIZES),
            getRange(SHEETS.RECORDS),
        ];

        const sheets = googleSheets.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: SHEET_ID,
            ranges,
        });
        
        const records = parseRows(response.data.valueRanges[5]);

        const sheetData = {
            contestants: parseRows(response.data.valueRanges[0]),
            benchmarks: parseRows(response.data.valueRanges[1]),
            controls: parseRows(response.data.valueRanges[2])[0] || {},
            users: parseRows(response.data.valueRanges[3]),
            prizes: parseRows(response.data.valueRanges[4]),
            records: records,
            winners: deriveWinners(records),
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

        const payload = { sheetData, prices, isMarketOpen, stockNames, lastUpdated: Date.now() };
        
        await redis.set('STOCK_DASHBOARD_DATA', payload, { ex: 900 });

        console.log("Sync complete.");
        return { statusCode: 200 };

    } catch (err) {
        console.error("Sync Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
    }
};

export const handler = schedule("*/10 * * * *", syncStockData);