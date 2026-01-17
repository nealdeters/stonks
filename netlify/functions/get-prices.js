const axios = require('axios');

// Global variables in Netlify Functions persist across "warm" starts
let cached = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

exports.handler = async (event) => {
    const API_KEY = process.env.FINNHUB_KEY;
    const SHEET_ID = process.env.SHEET_ID;
    const now = Date.now();

    // 1. Check if we have valid server-side data to share
    if (cached && (now - lastFetchTime < CACHE_DURATION)) {
        return { 
            statusCode: 200, 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prices: cached, sheetId: SHEET_ID })
        };
    }

    try {
        const tickers = event.queryStringParameters.tickers.split(',');
        const requests = tickers.map(t => 
            axios.get(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${API_KEY}`)
        );
        
        const responses = await Promise.all(requests);
        const data = responses.map((r, i) => ({ ticker: tickers[i], price: r.data.c, dp: r.data.dp }));

        // 2. Update the Global Cache
        cached = data;
        lastFetchTime = now;

        return { 
            statusCode: 200, 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prices: data, sheetId: SHEET_ID })
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};