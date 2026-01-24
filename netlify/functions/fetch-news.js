import { Redis } from '@upstash/redis';

export const handler = async (event, context) => {
    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    try {
        const data = await redis.get('STOCK_NEWS_DATA');
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300'
            },
            body: JSON.stringify(data || { news: [] })
        };
    } catch (error) {
        console.error('Fetch News Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch news' })
        };
    }
};