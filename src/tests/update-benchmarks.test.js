import { test, describe, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import axios from 'axios';
import * as googleSheets from '@googleapis/sheets';
import { run } from '../../scripts/update-benchmarks.js';

describe('Update Benchmarks Script', () => {
    let originalArgv;

    before(() => {
        process.env.SHEET_ID = 'test-sheet';
        process.env.FINNHUB_KEY = 'test-key';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.com';
        process.env.GOOGLE_PRIVATE_KEY = 'test-key';
    });

    beforeEach(() => {
        originalArgv = process.argv;
    });

    afterEach(() => {
        process.argv = originalArgv;
    });

    test('Skips update if today is not cutoff date (no force)', async (t) => {
        const getSpy = t.mock.fn(async () => ({
            data: { values: [['cutoff'], ['2099-12-31']] }
        }));

        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: { values: { get: getSpy } }
        }));

        const logSpy = t.mock.method(console, 'log');

        await run();

        assert.strictEqual(getSpy.mock.callCount(), 1);
        assert.ok(logSpy.mock.calls.some(c => c.arguments[0].includes('not the cutoff date')));
    });

    test('Proceeds if force flag is present regardless of date', async (t) => {
        process.argv = [...originalArgv, '--force'];

        const getSpy = t.mock.fn(async (params) => {
            if (params.range.includes('Controls')) {
                return { data: { values: [['cutoff'], ['2099-12-31']] } };
            }
            if (params.range.includes('Benchmarks')) {
                return { data: { values: [['ticker', 'price'], ['AAPL', '100']] } };
            }
        });

        const updateSpy = t.mock.fn(async () => ({}));

        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: { values: { get: getSpy, update: updateSpy } }
        }));

        t.mock.method(axios, 'get', async () => ({ data: { c: 150 } }));
        const logSpy = t.mock.method(console, 'log');

        await run();

        assert.ok(logSpy.mock.calls.some(c => c.arguments[0].includes('Force override enabled')));
        assert.strictEqual(updateSpy.mock.callCount(), 1);
        
        const updateCall = updateSpy.mock.calls[0];
        const values = updateCall.arguments[0].resource.values;
        assert.strictEqual(values[1][1], 150);
    });

    test('Proceeds if today matches cutoff date', async (t) => {
        const today = new Date().toISOString().split('T')[0];
        
        const getSpy = t.mock.fn(async (params) => {
            if (params.range.includes('Controls')) {
                return { data: { values: [['cutoff'], [today]] } };
            }
            if (params.range.includes('Benchmarks')) {
                return { data: { values: [['ticker', 'price'], ['AAPL', '100']] } };
            }
        });

        const updateSpy = t.mock.fn(async () => ({}));

        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: { values: { get: getSpy, update: updateSpy } }
        }));

        t.mock.method(axios, 'get', async () => ({ data: { c: 155 } }));

        await run();

        assert.strictEqual(updateSpy.mock.callCount(), 1);
        const values = updateSpy.mock.calls[0].arguments[0].resource.values;
        assert.strictEqual(values[1][1], 155);
    });

    test('Handles missing benchmarks gracefully', async (t) => {
        process.argv = [...originalArgv, '--force'];

        const getSpy = t.mock.fn(async (params) => {
            if (params.range.includes('Controls')) {
                return { data: { values: [['cutoff'], ['2099-12-31']] } };
            }
            if (params.range.includes('Benchmarks')) {
                return { data: { values: [] } };
            }
        });

        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: { values: { get: getSpy } }
        }));

        const logSpy = t.mock.method(console, 'log');

        await run();

        assert.ok(logSpy.mock.calls.some(c => c.arguments[0].includes('No benchmarks found')));
    });

    test('Exits if benchmark headers are invalid', async (t) => {
        process.argv = [...originalArgv, '--force'];
        
        const exitSpy = t.mock.method(process, 'exit', () => {});
        const errorSpy = t.mock.method(console, 'error', () => {});

        const getSpy = t.mock.fn(async (params) => {
            if (params.range.includes('Controls')) {
                return { data: { values: [['cutoff'], ['2099-12-31']] } };
            }
            if (params.range.includes('Benchmarks')) {
                return { data: { values: [['wrong_header'], ['data']] } };
            }
        });

        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: { values: { get: getSpy, update: async () => {} } }
        }));

        await run();

        assert.strictEqual(exitSpy.mock.callCount(), 1);
        assert.strictEqual(exitSpy.mock.calls[0].arguments[0], 1);
    });
});