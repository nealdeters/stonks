const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const axios = require('axios');
const googleSheets = require('@googleapis/sheets');
const { handler } = require('../netlify/functions/sync-stock-data.js');

describe('Scheduled Worker: sync-stock-data', () => {
    before(() => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://mock-redis.upstash.io';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
        process.env.FINNHUB_KEY = 'test-finnhub';
        process.env.SHEET_ID = 'test-sheet';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@google.com';
        process.env.GOOGLE_PRIVATE_KEY = 'test-key';
    });

    test('Fetches data, scrubs emails, and writes to Redis', async (t) => {
        let capturedRedisPayload = null;

        const originalFetch = global.fetch;
        global.fetch = async (url, options) => {
            if (url.includes('upstash')) {
                capturedRedisPayload = options.body; 

                const isPipeline = url.includes('/pipeline');
                const responseData = isPipeline ? [{ result: 'OK' }] : { result: 'OK' };

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
            }
            return originalFetch(url, options);
        };

        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: {
                values: {
                    batchGet: async () => ({
                        data: {
                            valueRanges: [
                                { values: [['useruuid', 'ticker', 'email'], ['u1', 'AAPL', 'test@email.com']] },
                                { values: [['ticker', 'price'], ['VOO', '500']] },
                                { values: [['key', 'value']] },
                                { values: [['id', 'name', 'email'], ['u1', 'Neal', 'neal@email.com']] },
                                { values: [] },
                                { values: [['user_uuid', 'name', 'place', 'year'], ['u1', 'Neal', '1', '2025']] }
                            ]
                        }
                    })
                }
            }
        }));

        t.mock.method(axios, 'get', async (url) => {
            if (url.includes('market-status')) return { data: { isOpen: true, holiday: null } };
            if (url.includes('symbol')) return { data: [{ symbol: 'AAPL', description: 'Apple Inc' }] };
            if (url.includes('quote')) return { data: { c: 150.00, dp: 1.5 } };
            return { data: {} };
        });

        try {
            const res = await handler();
            if (res.statusCode !== 200) {
                console.error('Sync Handler Failed:', res.body);
            }
            assert.strictEqual(res.statusCode, 200);

            assert.ok(capturedRedisPayload, 'Should have called Redis SET');
            
            const payloadString = capturedRedisPayload.toString();
            
            assert.ok(payloadString.includes('AAPL'), 'Should contain ticker data');
            assert.ok(payloadString.includes('Apple Inc'), 'Should contain enriched stock name');
            assert.ok(payloadString.includes('first_user_name'), 'Should contain derived winner data');
            
            assert.ok(!payloadString.includes('test@email.com'), 'Contestant email should be scrubbed');
            assert.ok(!payloadString.includes('neal@email.com'), 'User email should be scrubbed');

        } finally {
            global.fetch = originalFetch;
        }
    });
});