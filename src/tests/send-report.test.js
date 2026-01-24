import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import fs from 'fs';
import googleSheets from '@googleapis/sheets';
import { Resend } from 'resend';
import { run } from '../../scripts/send-report.js';

vi.mock('@googleapis/sheets');
vi.mock('resend', () => ({
    Resend: vi.fn()
}));
vi.mock('fs');

describe('Weekly Report Script', () => {
    beforeAll(() => {
        process.env.RESEND_API_KEY = 're_test_123';
        process.env.SHEET_ID = 'test_sheet_id';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.com';
        process.env.GOOGLE_PRIVATE_KEY = 'test-key';
    });

    beforeEach(() => {
        process.argv = ['node', 'scripts/send-report.js'];
        vi.clearAllMocks();
    });

    it('Sends report to manual recipients using --to flag', async () => {
        process.argv.push('--to=neal@test.com');

        vi.mocked(googleSheets.sheets).mockReturnValue({
            spreadsheets: {
                values: {
                    get: async () => ({
                        data: { values: [['title', 'end'], ['Schultz Cup', '2099-12-31']] }
                    })
                }
            }
        });

        vi.mocked(fs.readFileSync).mockImplementation((path) => {
            if (path.includes('leaderboard')) return Buffer.from('fake-base64-content');
            return Buffer.from('');
        });

        vi.mocked(fs.readdirSync).mockReturnValue(['leaderboard.png']);
        vi.mocked(fs.statSync).mockReturnValue({ mtime: { getTime: () => Date.now() } });

        const sendSpy = vi.fn().mockResolvedValue({ data: { id: 'ok' } });
        vi.mocked(Resend).mockImplementation(() => ({
            emails: { send: sendSpy }
        }));

        await run();

        expect(sendSpy).toHaveBeenCalledTimes(1);
        expect(sendSpy.mock.calls[0][0].to).toEqual(['neal@test.com']);
    });
});