import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncNews } from './sync-news';

vi.mock('axios');
vi.mock('@upstash/redis', () => ({
    Redis: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockResolvedValue('OK')
    }))
}));
vi.mock('google-auth-library');
vi.mock('@googleapis/sheets', () => ({
    default: {
        sheets: vi.fn().mockReturnValue({
            spreadsheets: {
                values: {
                    batchGet: vi.fn().mockResolvedValue({
                        data: {
                            valueRanges: [
                                { values: [['Ticker'], ['AAPL']] },
                                { values: [['Cutoff'], ['2025-12-31']] }
                            ]
                        }
                    })
                }
            }
        })
    }
}));

describe('syncNews', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.FINNHUB_KEY = 'test-key';
        process.env.SHEET_ID = 'test-id';
    });

    it('should be a function', () => {
        expect(typeof syncNews).toBe('function');
    });
});