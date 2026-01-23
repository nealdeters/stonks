import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncStockData } from './sync-stock-data';

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
                                { values: [['Ticker'], ['SPY']] },
                                { values: [['Cutoff'], ['2025-12-31']] },
                                { values: [['UUID'], ['123']] },
                                { values: [['Rank'], ['1']] },
                                { values: [['Year'], ['2024']] }
                            ]
                        }
                    })
                }
            }
        })
    }
}));

describe('syncStockData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.FINNHUB_KEY = 'test-key';
        process.env.SHEET_ID = 'test-id';
    });

    it('should be a function', () => {
        expect(typeof syncStockData).toBe('function');
    });
});