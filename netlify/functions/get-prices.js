const axios = require('axios');

// We now key the cache by the tickers requested to prevent cross-pollution
let globalCache = {};
const CACHE_DURATION = 5 * 60 * 1000;

exports.handler = async (event) => {
    const API_KEY = process.env.FINNHUB_KEY;
    const SHEET_ID = process.env.SHEET_ID;
    
    // 1. Robustly capture the tickers
    const rawTickers = event.queryStringParameters.tickers || '';
    const tickers = rawTickers.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
    
    // Create a unique key based on the alphabetized ticker list
    const cacheKey = tickers.sort().join(',');
    const now = Date.now();

    // 2. Check if THIS specific set of tickers is cached
    if (globalCache[cacheKey] && (now - globalCache[cacheKey].time < CACHE_DURATION)) {
        return { 
            statusCode: 200, 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prices: globalCache[cacheKey].data, sheetId: SHEET_ID })
        };
    }

    try {
        // Use a standard for loop or Promise.all as you had it
        const requests = tickers.map(t => 
            axios.get(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${API_KEY}`)
        );
        
        const responses = await Promise.all(requests);
        const data = responses.map((r, i) => ({ 
            ticker: tickers[i], 
            price: r.data.c || 0, // Fallback to 0 if API fails for one ticker
            dp: r.data.dp || 0 
        }));

        // 3. Store in the keyed cache
        globalCache[cacheKey] = { data: data, time: now };

        return { 
            statusCode: 200, 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prices: data, sheetId: SHEET_ID })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};