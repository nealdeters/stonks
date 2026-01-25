import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { updateBenchmarks } from '../../netlify/lib/benchmarks.js';
import { finalizeContest } from '../../netlify/lib/contest.js';
import { sendReminder } from '../../netlify/lib/reminders.js';
import { sendReport } from '../../netlify/lib/reports.js';
import { handler as dispatcher } from '../../netlify/functions/manual-dispatch.js';

// Mock dependencies
vi.mock('axios');
vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
        emails: { send: vi.fn().mockResolvedValue({ id: '123' }) }
    }))
}));

vi.mock('@sparticuz/chromium', () => ({
    default: { args: [], defaultViewport: {}, executablePath: vi.fn(), headless: true }
}));

vi.mock('puppeteer-core', () => ({
    default: {
        launch: vi.fn().mockResolvedValue({
            newPage: vi.fn().mockResolvedValue({
                setViewport: vi.fn(),
                goto: vi.fn(),
                screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-image')),
            }),
            close: vi.fn(),
        })
    }
}));

const mockBatchGet = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockAppend = vi.fn();
const mockClear = vi.fn();

vi.mock('@googleapis/sheets', () => ({
    default: {
        sheets: vi.fn().mockReturnValue({
            spreadsheets: {
                values: {
                    get: (...args) => mockGet(...args),
                    batchGet: (...args) => mockBatchGet(...args),
                    update: (...args) => mockUpdate(...args),
                    append: (...args) => mockAppend(...args),
                    clear: (...args) => mockClear(...args)
                }
            }
        })
    }
}));

vi.mock('google-auth-library', () => ({
    JWT: vi.fn().mockImplementation(() => ({}))
}));

describe('Scheduled Functions', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            SHEET_ID: 'test-sheet',
            FINNHUB_KEY: 'test-key',
            GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@test.com',
            GOOGLE_PRIVATE_KEY: 'test-key',
            RESEND_API_KEY: 'resend-key',
            SITE_URL: 'http://localhost',
            ADMIN_EMAIL: 'admin@test.com'
        };
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('updateBenchmarks', () => {
        it('updates benchmarks if force flag is present', async () => {
            mockGet.mockImplementation(async (params) => {
                if (params.range.includes('Controls')) return { data: { values: [['cutoff'], ['2099-12-31']] } };
                if (params.range.includes('Benchmarks')) return { data: { values: [['ticker', 'price'], ['AAPL', '100']] } };
            });
            vi.mocked(axios.get).mockResolvedValue({ data: { c: 150 } });

            const result = await updateBenchmarks({ queryStringParameters: { force: 'true' } });
            expect(result.statusCode).toBe(200);
            expect(mockUpdate).toHaveBeenCalled();
        });
    });

    describe('finalizeContest', () => {
        it('archives contestants if force flag is present', async () => {
            mockGet.mockImplementation(async (params) => {
                if (params.range.includes('Controls')) return { data: { values: [['end'], ['2099-12-31']] } };
                if (params.range.includes('Contestants')) return { 
                    data: { values: [['uuid', 'name', 'ticker', 'capital', 'cost', 'shares'], ['1', 'Neal', 'AAPL', '1000', '100', '10']] } 
                };
            });
            vi.mocked(axios.get).mockResolvedValue({ data: { c: 150 } });

            const result = await finalizeContest({ queryStringParameters: { force: 'true' } });
            expect(result.statusCode).toBe(200);
            expect(mockAppend).toHaveBeenCalled();
        });
    });

    describe('sendReminder', () => {
        it('uses manual recipient list if provided', async () => {
            mockGet.mockResolvedValue({
                data: { values: [['cutoff'], ['2099-12-31']] }
            });

            const result = await sendReminder({ queryStringParameters: { to: 'manual@test.com' } });
            expect(result.statusCode).toBe(200);
            expect(result.body).toContain('Reminders sent to 1 users');
            expect(mockBatchGet).not.toHaveBeenCalled();
        });
    });

    describe('sendReport', () => {
        it('sends report with attachment', async () => {
            // Mock fetch-data response for contest check
            vi.mocked(axios.get).mockResolvedValue({ 
                data: { sheetData: { controls: { end: '2099-12-31' } } } 
            });

            const result = await sendReport({ queryStringParameters: { force: 'true', to: 'test@test.com' } });
            
            expect(result.statusCode).toBe(200);
            expect(result.body).toContain('Report sent');
        });

        it('skips if contest is over', async () => {
            vi.mocked(axios.get).mockResolvedValue({ 
                data: { sheetData: { controls: { end: '2000-01-01' } } } 
            });

            const result = await sendReport({ queryStringParameters: {} });
            expect(result.body).toBe('Contest ended');
        });
    });

    describe('Dispatcher', () => {
        it('routes to correct task', async () => {
            // Mock the lib functions if needed, or rely on their mocked dependencies
            mockGet.mockImplementation(async (params) => {
                if (params.range.includes('Controls')) return { data: { values: [['cutoff'], ['2099-12-31']] } };
                if (params.range.includes('Benchmarks')) return { data: { values: [['ticker', 'price'], ['AAPL', '100']] } };
            });
            
            // Test 'benchmarks' routing
            vi.mocked(axios.get).mockResolvedValue({ data: { c: 150 } });
            const result = await dispatcher({ queryStringParameters: { task: 'benchmarks', force: 'true' } });
            
            expect(result.statusCode).toBe(200);
            expect(mockUpdate).toHaveBeenCalled();
        });
    });
});