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
    if (tickers.length === 0) {
        try {
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Payment`;
            const res = await axios.get(url);
            const text = res.data;
            const json = JSON.parse(text.substring(47).slice(0, -2));
            
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
                body: JSON.stringify({ sheetId: SHEET_ID, config, prices: [], cached: false })
            };
        } catch (err) {
            console.error("Payment Config Fetch Error:", err.message);
            return {
                statusCode: 200,
                headers: HEADERS,
                body: JSON.stringify({ sheetId: SHEET_ID, prices: [], cached: false })
            };
        }
    }

    const forceRefresh = event.queryStringParameters?.refresh === 'true';
    const cacheKey = [...tickers].sort().join(',');
    const now = Date.now();

    if (!forceRefresh && globalCache[cacheKey] && (now - globalCache[cacheKey].time < CACHE_DURATION)) {
        return { 
            statusCode: 200, 
            headers: HEADERS,
            body: JSON.stringify({ prices: globalCache[cacheKey].data, sheetId: SHEET_ID, cached: true })
        };
    }

    try {
        // Fetch Symbol List separately to keep price indexing clean
        let symbolMap = new Map();
        try {
            const symbolListResult = await axios.get(`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${API_KEY}`);
            if (Array.isArray(symbolListResult.data)) {
                symbolListResult.data.forEach(item => symbolMap.set(item.symbol, item.description));
            }
        } catch (e) {
            console.error("Symbol List Fetch Failed");
        }

        const priceRequests = tickers.map(symbol => 
            axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`)
        );
        
        const priceResults = await Promise.allSettled(priceRequests);

        const data = tickers.map((symbol, i) => {
            const result = priceResults[i];
            const priceData = result.status === 'fulfilled' ? result.value.data : {};

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
            headers: HEADERS,
            body: JSON.stringify({ error: "Internal Server Error", sheetId: SHEET_ID }) 
        };
    }
};