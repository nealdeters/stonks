const axios = require('axios');

let globalCache = {};
const CACHE_DURATION = 5 * 60 * 1000; 

exports.handler = async (event) => {
    const API_KEY = process.env.FINNHUB_KEY;
    const SHEET_ID = process.env.SHEET_ID;

    let rawTickers = event.queryStringParameters?.tickers || '';
    if (Array.isArray(rawTickers)) rawTickers = rawTickers.join(',');

    const tickers = rawTickers.split(',')
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0);

    // Handshake mode: If no tickers, just return the Sheet ID
    if (tickers.length === 0) {
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ sheetId: SHEET_ID, prices: [] })
        };
    }

    const cacheKey = [...tickers].sort().join(',');
    const now = Date.now();

    if (globalCache[cacheKey] && (now - globalCache[cacheKey].time < CACHE_DURATION)) {
        return { 
            statusCode: 200, 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prices: globalCache[cacheKey].data, sheetId: SHEET_ID, cached: true })
        };
    }

    try {
        const requests = tickers.map(symbol => 
            axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`)
        );
        const responses = await Promise.all(requests);
        const data = responses.map((r, i) => ({
            ticker: tickers[i],
            price: r.data?.c || 0,
            dp: r.data?.dp || 0
        }));

        globalCache[cacheKey] = { data: data, time: now };

        return { 
            statusCode: 200, 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prices: data, sheetId: SHEET_ID, cached: false })
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "Internal Server Error", sheetId: SHEET_ID }) 
        };
    }
};