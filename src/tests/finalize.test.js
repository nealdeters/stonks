const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const { mock } = require('node:test');
const axios = require('axios');
const { run } = require('../scripts/finalize');

describe('finalize.js - Calculation Logic', () => {
    
    beforeEach(() => {
        process.env.FINNHUB_KEY = 'mock-key';
        process.env.SHEET_ID = 'test-id';
        mock.restoreAll();
    });

    test('should calculate gain and assign correct place rank', async () => {
        let capturedArchive = null;
        
        mock.method(axios, 'get', async (url) => {
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
                            return { data: { values: [['end'], ['2025-01-01']] } };
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
                    append: async ({ resource }) => {
                        capturedArchive = resource.values;
                        return { status: 200 };
                    },
                    clear: async () => ({ status: 200 })
                }
            }
        };

        await run(mockSheets);

        expect(capturedArchive).not.toBeNull();
        
        expect(capturedArchive[0][1]).toBe('Neal');
        expect(capturedArchive[0][8]).toBe(1);
        expect(capturedArchive[0][7]).toBe('50.00%');

        expect(capturedArchive[1][1]).toBe('Kyle');
        expect(capturedArchive[1][8]).toBe(2);
        expect(capturedArchive[1][7]).toBe('10.00%');
    });
});