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

        const originalFetch = global.fetch;
        global.fetch = async (url) => {
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
        };

        try {
            const res = await handler();
            const body = JSON.parse(res.body);

            assert.strictEqual(res.statusCode, 200, `Status should be 200. Error: ${body.error}`);
            assert.ok(body.prices, 'Prices array should exist');
            assert.ok(Array.isArray(body.prices), 'Prices should be an array');
            assert.ok(body.prices.length > 0, 'Prices array should not be empty');
            assert.strictEqual(body.prices[0].ticker, 'AAPL', 'First ticker should be AAPL');
            assert.strictEqual(body.prices[0].price, 150.00, 'Price should match mock');
        } finally {
            global.fetch = originalFetch;
        }
    });
});