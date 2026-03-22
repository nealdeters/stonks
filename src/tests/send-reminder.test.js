import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import * as auth from '../../netlify/lib/auth.js';
import { Resend } from 'resend';
import { sendReminder } from '../../netlify/lib/reminders.js';

vi.mock('resend', () => ({ Resend: vi.fn() }));

describe('sendReminder lib', () => {
    beforeAll(() => {
        process.env.RESEND_API_KEY = 're_test_123';
        process.env.SHEET_ID = 'test_sheet_id';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.com';
        process.env.GOOGLE_PRIVATE_KEY = 'test-key';
        process.env.SITE_URL = 'https://stonks.com';
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Filters out already registered users and sends to pending only', async () => {
        const mockSheets = {
            spreadsheets: {
                values: {
                    get: async () => ({ data: { values: [['title', 'cutoff'], ['Schultz Cup', '2099-12-31']] } }),
                    batchGet: async () => ({
                        data: {
                            valueRanges: [
                                { values: [
                                    ['id', 'name', 'email'],
                                    ['1', 'Neal', 'neal@test.com'],
                                    ['2', 'Kirana', 'kirana@test.com'],
                                    ['3', 'Oliver', 'oliver@test.com']
                                ] },
                                { values: [
                                    ['uuid', 'name', 'email', 'ticker'],
                                    ['1', 'Neal', 'neal@test.com', 'AAPL']
                                ] }
                            ]
                        }
                    })
                }
            }
        };

        vi.spyOn(auth, 'validateGoogleEnvVars').mockImplementation(() => true);
        vi.spyOn(auth, 'getSheetsClient').mockResolvedValue(mockSheets);

        const sendSpy = vi.fn().mockResolvedValue({ data: { id: 'ok' } });
        vi.mocked(Resend).mockImplementation(() => ({ emails: { send: sendSpy } }));

        const res = await sendReminder({ queryStringParameters: {} });

        expect(sendSpy).toHaveBeenCalledTimes(1);
        const callArgs = sendSpy.mock.calls[0][0];

        expect(callArgs.to.length).toBe(2);
        expect(callArgs.to).toContain('kirana@test.com');
        expect(callArgs.to).toContain('oliver@test.com');
        expect(callArgs.to).not.toContain('neal@test.com');
        
        expect(callArgs.subject).toContain('Schultz Cup');
        expect(res.statusCode).toBe(200);
    });
});