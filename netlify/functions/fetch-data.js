const { Redis } = require('@upstash/redis');

const HEADERS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

exports.handler = async () => {
    try {
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        const data = await redis.get('STOCK_DASHBOARD_DATA');

        if (!data) {
            // Return empty structure if cache is cold to prevent frontend crash
            return { 
                statusCode: 200, 
                headers: HEADERS, 
                body: JSON.stringify({ 
                    sheetData: {
                        prizes: [], 
                        benchmarks: [], 
                        controls: {}, 
                        users: [], 
                        records: [],
                        winners: [],
                        contestants: []
                    }, 
                    prices: [], 
                    isMarketOpen: false 
                }) 
            };
        }

        return { 
            statusCode: 200, 
            headers: { ...HEADERS, "Cache-Control": "public, max-age=60, s-maxage=60" }, 
            body: JSON.stringify(data) 
        };
    } catch (err) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
    }
};