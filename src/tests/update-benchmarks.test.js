import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import * as auth from '../../netlify/lib/auth.js';
import { updateBenchmarks } from '../../netlify/lib/benchmarks.js';

vi.mock('axios');

describe('updateBenchmarks lib', () => {
    let originalArgv;

    beforeAll(() => {
        process.env.SHEET_ID = 'test-sheet';
        process.env.FINNHUB_KEY = 'test-key';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.com';
        process.env.GOOGLE_PRIVATE_KEY = 'test-key';
    });

    beforeEach(() => {
        originalArgv = process.argv;
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.argv = originalArgv;
    });

    it('Skips update if today is not cutoff date (no force)', async () => {
        const getSpy = vi.fn().mockResolvedValue({
            data: { values: [['cutoff'], ['2099-12-31']] }
        });

        const mockSheets = { spreadsheets: { values: { get: getSpy } } };

        vi.spyOn(auth, 'validateGoogleEnvVars').mockImplementation(() => true);
        vi.spyOn(auth, 'getSheetsClient').mockResolvedValue(mockSheets);

        const logSpy = vi.spyOn(console, 'log');

        await updateBenchmarks({ queryStringParameters: {} });

        expect(getSpy).toHaveBeenCalledTimes(1);
        expect(logSpy.mock.calls.some(c => c[0].includes('not the cutoff date'))).toBe(true);
    });

    it('Proceeds if force flag is present regardless of date', async () => {
        const getSpy = vi.fn().mockImplementation(async (params) => {
            if (params.range.includes('Controls')) return { data: { values: [['cutoff'], ['2099-12-31']] } };
            if (params.range.includes('Benchmarks')) {
                return { data: { values: [['ticker', 'price'], ['AAPL', '100']] } };
            }
        });

        const updateSpy = vi.fn().mockResolvedValue({});

        const mockSheets = { spreadsheets: { values: { get: getSpy, update: updateSpy } } };

        vi.spyOn(auth, 'validateGoogleEnvVars').mockImplementation(() => true);
        vi.spyOn(auth, 'getSheetsClient').mockResolvedValue(mockSheets);

        vi.mocked(axios.get).mockResolvedValue({ data: { c: 150 } });
        const logSpy = vi.spyOn(console, 'log');

        await updateBenchmarks({ queryStringParameters: { force: 'true' } });

        expect(logSpy.mock.calls.some(c => c[0].includes('Force override enabled'))).toBe(true);
        expect(updateSpy).toHaveBeenCalledTimes(1);
        
        const values = updateSpy.mock.calls[0][0].resource.values;
        expect(values[1][1]).toBe(150);
    });

    it('Proceeds if today matches cutoff date', async () => {
        const today = new Date().toISOString().split('T')[0];
        
        const getSpy = vi.fn().mockImplementation(async (params) => {
            if (params.range.includes('Controls')) return { data: { values: [['cutoff'], [today]] } };
            if (params.range.includes('Benchmarks')) {
                return { data: { values: [['ticker', 'price'], ['AAPL', '100']] } };
            }
        });

        const updateSpy = vi.fn().mockResolvedValue({});

        const mockSheets = { spreadsheets: { values: { get: getSpy, update: updateSpy } } };

        vi.spyOn(auth, 'validateGoogleEnvVars').mockImplementation(() => true);
        vi.spyOn(auth, 'getSheetsClient').mockResolvedValue(mockSheets);

        vi.mocked(axios.get).mockResolvedValue({ data: { c: 155 } });

        await updateBenchmarks({ queryStringParameters: {} });

        expect(updateSpy).toHaveBeenCalledTimes(1);
        const values = updateSpy.mock.calls[0][0].resource.values;
        expect(values[1][1]).toBe(155);
    });

    it('Handles missing benchmarks gracefully', async () => {
        const getSpy = vi.fn().mockImplementation(async (params) => {
            if (params.range.includes('Controls')) return { data: { values: [['cutoff'], ['2099-12-31']] } };
            if (params.range.includes('Benchmarks')) {
                return { data: { values: [] } };
            }
        });

        const mockSheets = { spreadsheets: { values: { get: getSpy } } };

        vi.spyOn(auth, 'validateGoogleEnvVars').mockImplementation(() => true);
        vi.spyOn(auth, 'getSheetsClient').mockResolvedValue(mockSheets);

        const logSpy = vi.spyOn(console, 'log');

        await updateBenchmarks({ queryStringParameters: { force: 'true' } });

        expect(logSpy.mock.calls.some(c => c[0].includes('No benchmarks found'))).toBe(true);
    });

    it('Exits if benchmark headers are invalid', async () => {
        const getSpy = vi.fn().mockImplementation(async (params) => {
            if (params.range.includes('Controls')) return { data: { values: [['cutoff'], ['2099-12-31']] } };
            if (params.range.includes('Benchmarks')) {
                return { data: { values: [['wrong_header'], ['data']] } };
            }
        });

        const mockSheets = { spreadsheets: { values: { get: getSpy, update: async () => {} } } };

        vi.spyOn(auth, 'validateGoogleEnvVars').mockImplementation(() => true);
        vi.spyOn(auth, 'getSheetsClient').mockResolvedValue(mockSheets);

        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const res = await updateBenchmarks({ queryStringParameters: { force: 'true' } });

        expect(res.statusCode).toBe(500);
    });
});