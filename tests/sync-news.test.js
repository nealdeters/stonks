const { describe, it, before, after, mock } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const axios = require('axios');
const upstash = require('@upstash/redis');
const googleAuth = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');
const netlifyFunctions = require('@netlify/functions');
const helpers = require('../src/utils/helpers');

describe('Sync News Function', () => {
    let handler;
    let mockRedisSet;
    let mockSheetsBatchGet;
    let originalAxiosGet;
    let originalSheets;
    let originalGetRange;
    let originalParseRows;
    let originalRedis;
    let originalJWT;
    let originalSchedule;

    before(() => {
        process.env.FINNHUB_KEY = 'test-key';
        process.env.SHEET_ID = 'sheet-id';
        process.env.GOOGLE_PRIVATE_KEY = 'private-key';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'email';
        process.env.UPSTASH_REDIS_REST_URL = 'http://redis';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

        originalAxiosGet = axios.get;
        axios.get = mock.fn(async () => ({ data: [] }));

        mockRedisSet = mock.fn(() => Promise.resolve('OK'));
        originalRedis = upstash.Redis;
        upstash.Redis = mock.fn(() => ({ set: mockRedisSet }));

        originalJWT = googleAuth.JWT;
        googleAuth.JWT = mock.fn(() => ({ authorize: () => {} }));

        mockSheetsBatchGet = mock.fn(async () => ({ 
            data: { 
                valueRanges: [{ values: [] }, { values: [] }] 
            } 
        }));
        originalSheets = googleSheets.sheets;
        googleSheets.sheets = mock.fn(() => ({
            spreadsheets: { values: { batchGet: mockSheetsBatchGet } }
        }));

        originalSchedule = netlifyFunctions.schedule;
        netlifyFunctions.schedule = mock.fn((cron, h) => h);

        originalGetRange = helpers.getRange;
        helpers.getRange = mock.fn(() => 'Contestants!A:Z');

        originalParseRows = helpers.parseRows;
        helpers.parseRows = mock.fn((data) => {
            if (!data.values) return [];
            const [headers, ...rows] = data.values;
            return rows.map(row => ({ ticker: row[0] }));
        });

        const modulePath = require.resolve('../netlify/functions/sync-news.js');
        delete require.cache[modulePath];

        const syncNews = require('../netlify/functions/sync-news');
        handler = syncNews.handler;
    });

    after(() => {
        if (originalRedis) upstash.Redis = originalRedis;
        if (originalJWT) googleAuth.JWT = originalJWT;
        if (originalSchedule) netlifyFunctions.schedule = originalSchedule;
        if (originalAxiosGet) axios.get = originalAxiosGet;
        if (originalSheets) googleSheets.sheets = originalSheets;
        if (originalGetRange) helpers.getRange = originalGetRange;
        if (originalParseRows) helpers.parseRows = originalParseRows;
    });

    it('should handle errors gracefully', async () => {
        mockSheetsBatchGet.mock.mockImplementationOnce(async () => {
            throw new Error('Sheet Error');
        });

        const response = await handler();

        assert.strictEqual(response.statusCode, 500);
        const body = JSON.parse(response.body);
        assert.strictEqual(body.error, 'Sheet Error');
    });
});