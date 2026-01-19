const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const puppeteer = require('puppeteer');
const axios = require('axios');

describe('Capture Script (Puppeteer)', () => {
    before(() => {
        process.env.SITE_URL = 'https://stonks-test.netlify.app';
    });

    beforeEach(() => {
        process.argv = ['node', 'src/capture.js'];
        // Clear cache so the script picks up new mocks
        delete require.cache[require.resolve('../src/capture.js')];
    });

    test('Successfully takes a screenshot when contest is active', async (t) => {
        // 1. Mock Axios for the contest end check
        t.mock.method(axios, 'get', async () => ({
            data: {
                sheetData: {
                    controls: { end: '2099-12-31' } // Way in the future
                }
            }
        }));

        // 2. Mock Puppeteer (The heavy lifting)
        const screenshotSpy = t.mock.fn(async () => Buffer.from('fake-png-data'));
        const gotoSpy = t.mock.fn(async () => ({}));
        
        t.mock.method(puppeteer, 'launch', async () => ({
            newPage: async () => ({
                setViewport: async () => {},
                goto: gotoSpy,
                screenshot: screenshotSpy
            }),
            close: async () => {}
        }));

        // 3. Mock fs to prevent writing files
        t.mock.method(fs, 'existsSync', () => true);
        t.mock.method(fs, 'mkdirSync', () => {});
        const writeSpy = t.mock.method(fs, 'writeFileSync', () => {});

        // 4. Run the script
        // We use require to trigger the execution logic
        require('../src/capture.js');

        // Since the script runs an IIFE, we give it a moment to resolve
        await new Promise(resolve => setTimeout(resolve, 100));

        // 5. Assertions
        assert.strictEqual(gotoSpy.mock.callCount(), 1);
        assert.strictEqual(gotoSpy.mock.calls[0].arguments[0], process.env.SITE_URL);
        assert.strictEqual(screenshotSpy.mock.callCount(), 1);
    });

    test('Skips screenshot when contest has ended', async (t) => {
        // Mock contest as ended
        t.mock.method(axios, 'get', async () => ({
            data: {
                sheetData: {
                    controls: { end: '2020-01-01' }
                }
            }
        }));

        const logSpy = t.mock.method(console, 'log');
        const launchSpy = t.mock.method(puppeteer, 'launch');

        require('../src/capture.js');
        
        // Give the async IIFE time to run
        await new Promise(resolve => setTimeout(resolve, 150));

        // MATCH THE ACTUAL LOG MESSAGE: "Contest has ended"
        assert.ok(
            logSpy.mock.calls.some(c => c.arguments[0].includes('Contest has ended')),
            "Expected 'Contest has ended' log message was not found"
        );
        
        assert.strictEqual(launchSpy.mock.callCount(), 0, "Puppeteer should not have launched");
    });
});