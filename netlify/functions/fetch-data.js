const axios = require('axios');
const { JWT } = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');
const { SHEETS, getRange, parseRows } = require('../../src/utils/helpers');

const HEADERS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const API_BASE_URL = "https://finnhub.io/api/v1";

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
        getRange(SHEETS.WINNERS),
    ];

    const fetchAllData = async (tickers) => {
        // 1. Define the unique singular requests
        const marketStatusReq = axios.get(`${API_BASE_URL}/stock/market-status?exchange=US&token=${API_KEY}`);
        const symbolListReq = axios.get(`${API_BASE_URL}/stock/symbol?exchange=US&token=${API_KEY}`);

        // 2. Define the mapped price requests
        const priceReqs = tickers.map(t => 
            axios.get(`${API_BASE_URL}/quote?symbol=${t}&token=${API_KEY}`)
        );

        // 3. Batch and Destructure
        // We pull out the status and symbols specifically, then spread the rest into priceResults
        const [statusRes, symbolsRes, ...priceResults] = await Promise.all([
            marketStatusReq,
            symbolListReq,
            ...priceReqs
        ]);

        // 4. Extract Data
        const { isOpen, holiday } = statusRes.data;
        const allSymbols = symbolsRes.data; // This is the large array you needed
        
        const prices = priceResults.map((res, i) => ({
            ticker: tickers[i],
            price: res.data.c,
            dp: res.data.dp,
            // Match ticker to symbol list to get company name
            name: allSymbols.find(s => s.symbol === tickers[i])?.description || 'Unknown'
        }));

        return {
            isMarketOpen: isOpen,
            holidayName: holiday,
            prices,
            allSymbols
        };
    };

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

        const tickers = [...new Set([...sheetData.contestants.map(c => c.ticker), ...sheetData.benchmarks.map(b => b.ticker)])].filter(Boolean);

        // const priceRequests = tickers.map(t => 
        //     axios.get(`${API_BASE_URL}/quote?symbol=${t}&token=${API_KEY}`)
        // );
        
        // const symbolListRequest = axios.get(`${API_BASE_URL}/stock/symbol?exchange=US&token=${API_KEY}`);
        // const [symbolListResult, ...priceResults] = await Promise.all([
        //     symbolListRequest,
        //     ...priceRequests
        // ]);
        const { isMarketOpen, prices, allSymbols } = await fetchAllData(tickers);

        // Generate Name Map for all historical and active tickers
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

        // const symbolMap = new Map(
        //     Array.isArray(symbolListResult.data) ? symbolListResult.data.map(item => [item.symbol, item.description]) : []
        // );

        // const prices = tickers.map((ticker, i) => {
        //     const res = priceResults[i];
        //     return {
        //         ticker,
        //         name: symbolMap.get(ticker) || ticker,
        //         price: res.data?.c || 0,
        //         dp: res.data?.dp || 0
        //     };
        // });

        return { 
            statusCode: 200, 
            headers: { ...HEADERS, "Cache-Control": "public, max-age=300, s-maxage=300" }, 
            body: JSON.stringify({ sheetData, prices, isMarketOpen, stockNames }) 
        };
    } catch (err) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
    }
};