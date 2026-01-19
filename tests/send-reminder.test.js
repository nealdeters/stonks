const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const googleAuth = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');
const resendModule = require('resend');

describe('Contest Reminder Script', () => {
    before(() => {
        process.env.RESEND_API_KEY = 're_test_123';
        process.env.SHEET_ID = 'test_sheet_id';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.com';
        process.env.GOOGLE_PRIVATE_KEY = 'test-key';
        process.env.SITE_URL = 'https://stonks.com';
    });

    beforeEach(() => {
        process.argv = ['node', 'scripts/send-reminder.js'];
        // Clear cache so the script picks up new mocks
        delete require.cache[require.resolve('../scripts/send-reminder.js')];
    });

    test('Filters out already registered users and sends to pending only', async (t) => {
        // 1. Mock JWT
        const originalJWT = googleAuth.JWT;
        googleAuth.JWT = function() {
            return { authorize: async () => ({}) };
        };

        // 2. Mock Google Sheets batchGet
        t.mock.method(googleSheets, 'sheets', () => ({
            spreadsheets: {
                values: {
                    get: async () => ({
                        data: { values: [['title', 'cutoff'], ['Schultz Cup', '2099-12-31']] }
                    }),
                    batchGet: async () => ({
                        data: {
                            valueRanges: [
                                { 
                                    values: [
                                        ['id', 'name', 'email'],
                                        ['1', 'Neal', 'neal@test.com'],
                                        ['2', 'Kirana', 'kirana@test.com'],
                                        ['3', 'Oliver', 'oliver@test.com']
                                    ] 
                                },
                                { 
                                    values: [
                                        ['uuid', 'name', 'email', 'ticker'],
                                        ['1', 'Neal', 'neal@test.com', 'AAPL']
                                    ] 
                                }
                            ]
                        }
                    })
                }
            }
        }));

        const originalReadFileSync = fs.readFileSync;
        t.mock.method(fs, 'readFileSync', (path, options) => {
            return originalReadFileSync(path, options);
        });

        const sendSpy = t.mock.fn(async () => ({ data: { id: 'ok' } }));
        const originalResend = resendModule.Resend;
        resendModule.Resend = function() {
            return { emails: { send: sendSpy } };
        };

        try {
            const { run } = require('../scripts/send-reminder.js');
            await run();

            assert.strictEqual(sendSpy.mock.callCount(), 1);
            
            const callArgs = sendSpy.mock.calls[0].arguments[0];

            assert.strictEqual(callArgs.to.length, 2);
            assert.ok(callArgs.to.includes('kirana@test.com'));
            assert.ok(callArgs.to.includes('oliver@test.com'));
            assert.ok(!callArgs.to.includes('neal@test.com'));
            
            assert.ok(callArgs.subject.includes('Schultz Cup'));
        } finally {
            googleAuth.JWT = originalJWT;
            resendModule.Resend = originalResend;
        }
    });
});