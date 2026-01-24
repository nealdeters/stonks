import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before import
vi.mock('axios');
vi.mock('@googleapis/sheets', () => ({
    default: {
        sheets: vi.fn().mockReturnValue({
            spreadsheets: {
                values: {
                    batchGet: vi.fn().mockRejectedValue(new Error('Should not reach API call in this test'))
                }
            }
        })
    }
}));
vi.mock('@upstash/redis', () => ({
    Redis: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockResolvedValue('OK'),
        get: vi.fn().mockResolvedValue(null)
    }))
}));
vi.mock('google-auth-library', () => ({
    JWT: vi.fn().mockImplementation(() => ({}))
}));

// Import the functions under test
import { syncStockData } from '../../netlify/functions/sync-stock-data.js';
import { syncNews } from '../../netlify/functions/sync-news.js';

describe('Netlify Functions Error Handling', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        // Simulate missing environment variables
        delete process.env.GOOGLE_PRIVATE_KEY;
        delete process.env.UPSTASH_REDIS_REST_URL;
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.clearAllMocks();
    });

    it('syncStockData handles missing env vars gracefully (returns 500)', async () => {
        // This would previously crash the process due to undefined.replace
        const result = await syncStockData();
        
        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.error).toBeDefined();
        // It might fail on Redis init or JWT init, but it should be caught
    });

    it('syncNews handles missing env vars gracefully (returns 500)', async () => {
        const result = await syncNews();
        
        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.error).toBeDefined();
    });
});
