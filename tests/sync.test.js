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

        // 1. Mock global.fetch for Redis SET command
        const originalFetch = global.fetch;
        global.fetch = async (url, options) => {
            if (url.includes('upstash')) {
                // Capture the body sent to Redis to verify scrubbing
                capturedRedisPayload = options.body; 

                // Handle Auto-Pipelining: If the client uses /pipeline, it expects an array response
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

        // 2. Mock Google Sheets
        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: {
                values: {
                    batchGet: async () => ({
                        data: {
                            valueRanges: [
                                { values: [['useruuid', 'ticker', 'email'], ['u1', 'AAPL', 'test@email.com']] }, // Contestants
                                { values: [['ticker', 'price'], ['VOO', '500']] }, // Benchmarks
                                { values: [['key', 'value']] }, // Controls
                                { values: [['id', 'name', 'email'], ['u1', 'Neal', 'neal@email.com']] }, // Users
                                { values: [] }, // Prizes
                                { values: [] }, // Records
                                { values: [] }  // Winners
                            ]
                        }
                    })
                }
            }
        }));

        // 3. Mock Axios (Finnhub)
        t.mock.method(axios, 'get', async (url) => {
            if (url.includes('market-status')) return { data: { isOpen: true, holiday: null } };
            if (url.includes('symbol')) return { data: [{ symbol: 'AAPL', description: 'Apple Inc' }] };
            if (url.includes('quote')) return { data: { c: 150.00, dp: 1.5 } };
            return { data: {} };
        });

        try {
            // Execute Handler
            const res = await handler();
            if (res.statusCode !== 200) {
                console.error('Sync Handler Failed:', res.body);
            }
            assert.strictEqual(res.statusCode, 200);

            // Verify Redis Write
            assert.ok(capturedRedisPayload, 'Should have called Redis SET');
            
            // The payload is a JSON string containing the command and arguments
            // We need to ensure the data inside DOES NOT contain emails
            const payloadString = capturedRedisPayload.toString();
            
            assert.ok(payloadString.includes('AAPL'), 'Should contain ticker data');
            assert.ok(payloadString.includes('Apple Inc'), 'Should contain enriched stock name');
            
            // CRITICAL: Verify PII Scrubbing
            assert.ok(!payloadString.includes('test@email.com'), 'Contestant email should be scrubbed');
            assert.ok(!payloadString.includes('neal@email.com'), 'User email should be scrubbed');

        } finally {
            global.fetch = originalFetch;
        }
    });
});