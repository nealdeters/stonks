const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const googleAuth = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');
const resendModule = require('resend');

describe('Weekly Report Script', () => {
    before(() => {
        process.env.RESEND_API_KEY = 're_test_123';
        process.env.SHEET_ID = 'test_sheet_id';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.com';
        process.env.GOOGLE_PRIVATE_KEY = 'test-key';
    });

    beforeEach(() => {
        process.argv = ['node', 'scripts/send-report.js'];
        delete require.cache[require.resolve('../scripts/send-report.js')];
    });

    test('Sends report to manual recipients using --to flag', async (t) => {
        process.argv.push('--to=neal@test.com');

        const originalJWT = googleAuth.JWT;
        googleAuth.JWT = function() {
            return { authorize: async () => ({}) };
        };

        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: {
                values: {
                    get: async () => ({
                        data: { values: [['title', 'end'], ['Schultz Cup', '2099-12-31']] }
                    })
                }
            }
        }));

        const originalReadFileSync = fs.readFileSync;
        t.mock.method(fs, 'readFileSync', (path, options) => {
            if (path.toString().includes('leaderboard')) {
                return Buffer.from('fake-base64-content');
            }
            return originalReadFileSync(path, options);
        });

        t.mock.method(fs, 'readdirSync', () => ['leaderboard.png']);
        t.mock.method(fs, 'statSync', () => ({ mtime: { getTime: () => Date.now() } }));

        const sendSpy = t.mock.fn(async () => ({ data: { id: 'ok' } }));
        const originalResend = resendModule.Resend;
        resendModule.Resend = function() {
            return { emails: { send: sendSpy } };
        };

        try {
            const { run } = require('../scripts/send-report.js');
            await run();

            assert.strictEqual(sendSpy.mock.callCount(), 1, "The email send function was not called");
            assert.deepStrictEqual(sendSpy.mock.calls[0].arguments[0].to, ['neal@test.com']);
        } finally {
            googleAuth.JWT = originalJWT;
            resendModule.Resend = originalResend;
        }
    });
});