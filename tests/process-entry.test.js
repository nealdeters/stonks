const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const axios = require('axios');
const googleSheets = require('@googleapis/sheets');
const { handler } = require('../netlify/functions/process-entry.js');

describe('Registration Logic: process-entry', () => {
    before(() => {
        process.env.SHEET_ID = 'TEST_SHEET';
        process.env.FINNHUB_KEY = 'TEST_KEY';
        process.env.APP_SECRET = 'GO';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.com';
        process.env.GOOGLE_PRIVATE_KEY = 'test-key';
    });

    const mockBatchResponse = (userRows = [], contestantRows = [], controlRows = []) => ({
        data: {
            valueRanges: [
                { values: [['id', 'name', 'email'], ...userRows] },
                { values: [['id', 'email', 'ticker'], ...contestantRows] },
                { values: [['secret', 'cutoff'], ['GO', '2099-12-31'], ...controlRows] }
            ]
        }
    });

    test('Fails when secret is incorrect', async (t) => {
        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: {
                values: {
                    batchGet: async () => mockBatchResponse()
                }
            }
        }));

        const res = await handler({ body: JSON.stringify({ secret: 'WRONG' }) });
        assert.strictEqual(res.statusCode, 422);
    });

    test('Validates "If user exists but no contestant, adds to contestants"', async (t) => {
        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: {
                values: {
                    batchGet: async () => mockBatchResponse([['U1', 'Neal', 'neal@test.com']], []),
                    append: async () => ({ status: 200 })
                }
            }
        }));
        t.mock.method(axios, 'get', async (url) => {
            if (url.includes('market-status')) return { data: { isOpen: true } };
            if (url.includes('quote')) return { data: { c: 150 } };
            return { data: {} };
        });

        const res = await handler({
            body: JSON.stringify({ name: 'Neal', email: 'neal@test.com', ticker: 'AAPL', secret: 'GO' })
        });
        assert.strictEqual(res.statusCode, 200);
    });

    test('Prevents duplicate contestant entry for same user', async (t) => {
        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: {
                values: {
                    batchGet: async () => mockBatchResponse(
                        [['U1', 'Neal', 'neal@test.com']],
                        [['U1', 'neal@test.com', 'TSLA']]
                    )
                }
            }
        }));
        
        t.mock.method(axios, 'get', async (url) => {
            if (url.includes('market-status')) return { data: { isOpen: true } };
            return { data: {} };
        });

        const res = await handler({
            body: JSON.stringify({ name: 'Neal', email: 'neal@test.com', ticker: 'AAPL', secret: 'GO' })
        });
        assert.strictEqual(res.statusCode, 422);
        assert.strictEqual(JSON.parse(res.body).error, "User already has an entry.");
    });
});