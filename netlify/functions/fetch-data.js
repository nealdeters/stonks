import { Redis } from '@upstash/redis';

const HEADERS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

export const handler = async () => {
    try {
        console.log("Init Redis connection...");
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        const data = await redis.get('STOCK_DASHBOARD_DATA');
        console.log("Redis Data:", data ? "Found" : "Not Found");

        if (!data) {
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
            body: JSON.stringify(data) || "{}"
        };
    } catch (err) {
        console.error("Fetch Data Error:", err);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
    }
};