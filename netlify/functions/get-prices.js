const axios = require('axios');

let globalCache = {};
const CACHE_DURATION = 5 * 60 * 1000; 

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
};

exports.handler = async (event) => {
    const API_KEY = process.env.FINNHUB_KEY;
    const SHEET_ID = process.env.SHEET_ID;

    let rawTickers = event.queryStringParameters?.tickers || '';
    if (Array.isArray(rawTickers)) rawTickers = rawTickers.join(',');

    const tickers = rawTickers.split(',')
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0);

    // --- HANDSHAKE MODE ---
    // If no tickers are requested, fetch the Payment config and return it
    if (tickers.length === 0) {
        try {
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Payment`;
            const res = await axios.get(url);
            const text = res.data;
            const json = JSON.parse(text.substring(47).slice(0, -2));
            
            // Map the first row of the Payment tab to a config object
            const row = json.table.rows[0].c;
            const config = {
                entryFee: row[0]?.v || 0,
                username: row[1]?.v || '',
                paymentUrl: row[2]?.v || '',
                paymentButtonText: row[3]?.v || 'Pay Entry Fee'
            };

            return {
                statusCode: 200,
                headers: HEADERS,
                body: JSON.stringify({ sheetId: SHEET_ID, config, prices: [] })
            };
        } catch (err) {
            console.error("Payment Config Fetch Error:", err);
            return {
                statusCode: 200,
                headers: HEADERS,
                body: JSON.stringify({ sheetId: SHEET_ID, prices: [] })
            };
        }
    }

   // Check if the user specifically requested to bypass the cache
    const forceRefresh = event.queryStringParameters?.refresh === 'true';

    // --- LIVE PRICE MODE ---
    const cacheKey = [...tickers].sort().join(',');
    const now = Date.now();

    // Modified condition: only return cache if NOT forcing a refresh
    if (!forceRefresh && globalCache[cacheKey] && (now - globalCache[cacheKey].time < CACHE_DURATION)) {
        return { 
            statusCode: 200, 
            headers: HEADERS,
            body: JSON.stringify({ prices: globalCache[cacheKey].data, sheetId: SHEET_ID, cached: true })
        };
    }

    try {
        const priceRequests = tickers.map(symbol => 
            axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`)
        );
        
        const symbolListRequest = axios.get(`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${API_KEY}`);

        const [symbolListResult, ...priceResults] = await Promise.all([
            symbolListRequest,
            ...priceRequests
        ]);

        const symbolMap = new Map(
            symbolListResult.data.map(item => [item.symbol, item.description])
        );

        const data = tickers.map((symbol, i) => {
            const quoteResult = priceResults[i];
            const priceData = quoteResult.status === 200 ? quoteResult.data : {};

            return {
                ticker: symbol,
                name: symbolMap.get(symbol) || symbol, 
                price: priceData.c || 0,
                dp: priceData.dp || 0
            };
        });

        globalCache[cacheKey] = { data: data, time: now };

        return { 
            statusCode: 200, 
            headers: HEADERS,
            body: JSON.stringify({ prices: data, sheetId: SHEET_ID, cached: false })
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "Internal Server Error", sheetId: SHEET_ID }) 
        };
    }
};