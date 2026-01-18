const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const axios = require('axios');
const { handler } = require('../netlify/functions/get-prices.js');

describe('Backend Function: get-prices', () => {
    
    before(() => {
        process.env.SHEET_ID = 'TEST_SHEET_ID';
        process.env.FINNHUB_KEY = 'TEST_KEY';
    });

    test('Handshake returns Sheet ID and empty prices', async (t) => {
        t.mock.method(axios, 'get', async () => {
            return { 
                data: '/*O_o*/\ngoogle.visualization.Query.setResponse({"table":{"rows":[{"c":[{"v":10},{"v":"test"},{"v":"url"},{"v":"Pay"}]}]}});' 
            };
        });

        const response = await handler({ queryStringParameters: {} });
        const body = JSON.parse(response.body);
        
        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(body.sheetId, 'TEST_SHEET_ID');
        assert.deepStrictEqual(body.prices, []);
        assert.strictEqual(body.cached, false);
    });

    test('Successfully fetches and caches prices', async (t) => {
        const getMock = t.mock.method(axios, 'get', async (url) => {
            if (url.includes('quote')) return { data: { c: 150.00, dp: 1.5 }, status: 200 };
            if (url.includes('symbol')) return { data: [{ symbol: 'AAPL', description: 'Apple' }], status: 200 };
            return { data: {}, status: 200 };
        });

        const res1 = await handler({ queryStringParameters: { tickers: 'AAPL' } });
        const body1 = JSON.parse(res1.body);
        assert.strictEqual(body1.cached, false);

        const res2 = await handler({ queryStringParameters: { tickers: 'AAPL' } });
        const body2 = JSON.parse(res2.body);
        assert.strictEqual(body2.cached, true);
    });

    test('Handles partial API failures gracefully', async (t) => {
        t.mock.method(axios, 'get', async (url) => {
            // Precise matching for the FAIL ticker
            if (url.includes('symbol=FAIL')) throw new Error('API Down');
            if (url.includes('symbol=AAPL')) return { data: { c: 100, dp: 1 }, status: 200 };
            // Symbol list request
            if (url.includes('stock/symbol')) return { data: [], status: 200 };
            return { data: {}, status: 200 };
        });

        const response = await handler({ queryStringParameters: { tickers: 'AAPL,FAIL' } });
        const body = JSON.parse(response.body);

        assert.strictEqual(Array.isArray(body.prices), true, 'Prices should be an array');
        assert.strictEqual(body.prices.length, 2);
        
        // Find AAPL in the results to avoid index-dependency in assertions
        const aapl = body.prices.find(p => p.ticker === 'AAPL');
        const fail = body.prices.find(p => p.ticker === 'FAIL');

        assert.ok(aapl, 'AAPL should be in the response');
        assert.strictEqual(aapl.price, 100, 'AAPL price should be 100');
        
        assert.ok(fail, 'FAIL should be in the response');
        assert.strictEqual(fail.price, 0, 'Failing ticker should return price 0');
    });
});