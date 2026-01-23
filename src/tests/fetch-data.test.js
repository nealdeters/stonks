const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const { handler } = require('../netlify/functions/fetch-data.js');

describe('Backend Function: fetch-data', () => {
    
    before(() => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://mock-redis.upstash.io';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
    });

    test('Successfully serves cached data from Redis', async (t) => {
        const mockRedisData = {
            sheetData: {
                contestants: [{ useruuid: 'u1', ticker: 'AAPL' }],
                records: [],
                prizes: [],
                benchmarks: [],
                controls: {},
                users: [],
                winners: []
            },
            prices: [{ ticker: 'AAPL', price: 150.00, dp: 1.5, name: 'Apple Inc' }],
            isMarketOpen: true,
            stockNames: { 'AAPL': 'Apple Inc' }
        };

        const fetchSpy = vi.stubGlobal('fetch', async (url) => {
            const isPipeline = url && url.includes('/pipeline');
            const responseData = isPipeline 
                ? [{ result: JSON.stringify(mockRedisData) }] 
                : { result: JSON.stringify(mockRedisData) };

            return {
                ok: true,
                status: 200,
                headers: {
                    get: () => 'application/json',
                    forEach: (cb) => cb('application/json', 'content-type')
                },
                json: async () => responseData,
                text: async () => JSON.stringify(responseData),
                clone: function() { return this; }
            };
        });

        try {
            const res = await handler();
            const body = JSON.parse(res.body);

            expect(res.statusCode).toBe(200);
            expect(body.prices).toBeDefined();
            expect(Array.isArray(body.prices)).toBe(true);
            expect(body.prices.length).toBeGreaterThan(0);
            expect(body.prices[0].ticker).toBe('AAPL');
            expect(body.prices[0].price).toBe(150.00);
        } finally {
            vi.unstubAllGlobals();
        }
    });
});