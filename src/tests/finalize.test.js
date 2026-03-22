import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as auth from '../../netlify/lib/auth.js';
import { finalizeContest } from '../../netlify/lib/contest.js';

vi.mock('axios');

describe('finalizeContest - Calculation Logic', () => {
    
    beforeEach(() => {
        process.env.FINNHUB_KEY = 'mock-key';
        process.env.SHEET_ID = 'test-id';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.com';
        process.env.GOOGLE_PRIVATE_KEY = 'test-key';
        vi.clearAllMocks();
    });

    it('should calculate gain and assign correct place rank', async () => {
        let capturedArchive = null;
        
        vi.mocked(axios.get).mockImplementation(async (url) => {
            if (url.includes('symbol=NVDA')) {
                return { data: { c: 150 } };
            }
            if (url.includes('symbol=AMD')) {
                return { data: { c: 110 } };
            }
            return { data: { c: 100 } };
        });

        const mockSheets = {
            spreadsheets: {
                values: {
                    get: async (params) => {
                        if (params.range.includes('Controls')) {
                            return { data: { values: [['end'], ['2000-01-01']] } };
                        }
                        if (params.range.includes('Records')) {
                             return { data: { values: [] } };
                        }
                        return { 
                            data: { 
                                values: [
                                    ['user_uuid', 'name', 'ticker', 'capital', 'cost', 'shares'],
                                    ['u1', 'Neal', 'NVDA', 1000, 100, 10],
                                    ['u2', 'Kyle', 'AMD', 1000, 100, 10]
                                ] 
                            } 
                        };
                    },
                    append: async (params) => {
                        const body = params.resource || params.requestBody;
                        capturedArchive = body.values;
                        return { status: 200 };
                    },
                    update: async (params) => {
                        const body = params.resource || params.requestBody;
                        capturedArchive = body.values;
                        return { status: 200 };
                    },
                    clear: async () => ({ status: 200 })
                }
            }
        };

        vi.spyOn(auth, 'validateGoogleEnvVars').mockImplementation(() => true);
        vi.spyOn(auth, 'getSheetsClient').mockResolvedValue(mockSheets);

        await finalizeContest({ queryStringParameters: {} });

        expect(capturedArchive).not.toBeNull();
        
        expect(capturedArchive[0][1]).toBe('Neal');
        expect(capturedArchive[0][8]).toBe(1);
        expect(capturedArchive[0][7]).toBe('50.00%');

        expect(capturedArchive[1][1]).toBe('Kyle');
        expect(capturedArchive[1][8]).toBe(2);
        expect(capturedArchive[1][7]).toBe('10.00%');
    });
});