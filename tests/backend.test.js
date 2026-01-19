const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const axios = require('axios');
const { handler } = require('../netlify/functions/fetch-data.js');

// Principal Note: We must mock these so the JWT and Sheets calls don't crash
const googleSheets = require('@googleapis/sheets');
const { JWT } = require('google-auth-library');

describe('Backend Function: fetch-data', () => {
    
    before(() => {
        process.env.SHEET_ID = 'TEST_SHEET_ID';
        process.env.FINNHUB_KEY = 'TEST_KEY';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.com';
        process.env.GOOGLE_PRIVATE_KEY = 'test-key';
    });

    test('Successfully fetches and caches prices', async (t) => {
        // 1. Mock the Google Sheets Batch Call
        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: {
                values: {
                    batchGet: async () => ({
                        data: {
                            valueRanges: [
                                { values: [['useruuid', 'ticker'], ['u1', 'AAPL']] }, // Contestants
                                { values: [['useruuid']] }, // Records
                                { values: [['rank']] }, // Prizes
                                { values: [['ticker', 'startprice'], ['VOO', '500']] }, // Benchmarks
                                { values: [['paymentbuttontext'], ['PAY']] } // Payment
                            ]
                        }
                    })
                }
            }
        }));

        // 2. Mock Axios for both the Symbol List and the Price Quote
        t.mock.method(axios, 'get', async (url) => {
            if (url.includes('stock/symbol')) {
                return { data: [{ symbol: 'AAPL', description: 'Apple Inc' }] };
            }
            return { data: { c: 150.00, dp: 1.5 } };
        });

        // 3. Execute Handler
        const res = await handler({ queryStringParameters: { tickers: 'AAPL' } });
        const body = JSON.parse(res.body);

        // 4. Hardened Assertions
        assert.strictEqual(res.statusCode, 200, 'Status should be 200');
        assert.ok(body.prices, 'Prices array should exist');
        assert.ok(Array.isArray(body.prices), 'Prices should be an array');
        
        // This is the line that was failing:
        assert.ok(body.prices.length > 0, 'Prices array should not be empty');
        assert.strictEqual(body.prices[0].ticker, 'AAPL', 'First ticker should be AAPL');
        assert.strictEqual(body.prices[0].price, 150.00, 'Price should match mock');
    });
});