import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { handler } from '../../netlify/functions/process-entry.js';
import * as helpers from '../../src/utils/helpers.js';

// Mock dependencies
vi.mock('axios');
vi.mock('google-auth-library', () => ({
    JWT: vi.fn().mockImplementation(() => ({
        authorize: vi.fn()
    }))
}));

// Mock Google Sheets
const mockAppend = vi.fn();
const mockBatchGet = vi.fn();

vi.mock('@googleapis/sheets', () => ({
    default: {
        sheets: vi.fn().mockReturnValue({
            spreadsheets: {
                values: {
                    batchGet: (...args) => mockBatchGet(...args),
                    append: (...args) => mockAppend(...args)
                }
            }
        })
    }
}));

// Mock Helpers to control validation logic during tests
vi.mock('../../src/utils/helpers.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        isContestEntryOpen: vi.fn(),
        isRegistrationClosed: vi.fn(),
        getRange: actual.getRange,
        SHEETS: actual.SHEETS
    };
});

describe('process-entry function', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            SHEET_ID: 'test-sheet-id',
            APP_SECRET: 'secret123',
            FINNHUB_KEY: 'finnhub-key',
            GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@test.com',
            GOOGLE_PRIVATE_KEY: 'private-key',
            SITE_URL: 'https://stonks.test'
        };
        vi.clearAllMocks();
        
        // Default helper mocks to allow entry
        vi.mocked(helpers.isContestEntryOpen).mockReturnValue(true);
        vi.mocked(helpers.isRegistrationClosed).mockReturnValue(false);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns 422 if secret is invalid', async () => {
        const event = {
            body: JSON.stringify({ secret: 'wrong' })
        };
        const result = await handler(event);
        expect(result.statusCode).toBe(422);
        expect(JSON.parse(result.body).error).toBe('Invalid Secret');
    });

    it('returns 422 if contest is not open', async () => {
        vi.mocked(helpers.isContestEntryOpen).mockReturnValue(false);
        const event = {
            body: JSON.stringify({ secret: 'secret123', ticker: 'AAPL', email: 'test@test.com' })
        };
        
        // Mock batchGet to return empty data so it proceeds to validation
        mockBatchGet.mockResolvedValue({
            data: { valueRanges: [[], [], []] }
        });

        const result = await handler(event);
        expect(result.statusCode).toBe(422);
        expect(JSON.parse(result.body).error).toContain('Contest does not open');
    });

    it('successfully processes a valid entry', async () => {
        const event = {
            body: JSON.stringify({ 
                secret: 'secret123', 
                ticker: 'AAPL', 
                email: 'new@test.com',
                name: 'New User'
            })
        };

        // Mock Sheets Data: No existing users, contestants, or controls
        mockBatchGet.mockResolvedValue({
            data: { valueRanges: [
                { values: [['uuid', 'name', 'email']] }, // Users
                { values: [['uuid', 'name', 'email', 'ticker']] }, // Contestants
                { values: [['key', 'value']] } // Controls
            ]}
        });

        // Mock Finnhub and Sync call
        vi.mocked(axios.get).mockImplementation(async (url) => {
            if (url.includes('finnhub')) {
                return { data: { c: 150, t: Math.floor(Date.now() / 1000) } };
            }
            return { status: 200 };
        });

        const result = await handler(event);
        
        expect(result.statusCode).toBe(200);
        expect(mockAppend).toHaveBeenCalledTimes(2); // Once for User, Once for Contestant
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('manual-dispatch?task=sync-stock'), { timeout: 9000 });
    });
});