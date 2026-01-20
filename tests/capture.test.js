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
        delete require.cache[require.resolve('../src/capture.js')];
    });

    test('Successfully takes a screenshot when contest is active', async (t) => {
        t.mock.method(axios, 'get', async () => ({
            data: {
                sheetData: {
                    controls: { end: '2099-12-31' }
                }
            }
        }));

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

        t.mock.method(fs, 'existsSync', () => true);
        t.mock.method(fs, 'mkdirSync', () => {});
        const writeSpy = t.mock.method(fs, 'writeFileSync', () => {});

        require('../src/capture.js');

        await new Promise(resolve => setTimeout(resolve, 100));

        assert.strictEqual(gotoSpy.mock.callCount(), 1);
        assert.strictEqual(gotoSpy.mock.calls[0].arguments[0], process.env.SITE_URL);
        assert.strictEqual(screenshotSpy.mock.callCount(), 1);
    });

    test('Skips screenshot when contest has ended', async (t) => {
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
        
        await new Promise(resolve => setTimeout(resolve, 150));

        assert.ok(
            logSpy.mock.calls.some(c => c.arguments[0].includes('Contest has ended')),
            "Expected 'Contest has ended' log message was not found"
        );
        
        assert.strictEqual(launchSpy.mock.callCount(), 0, "Puppeteer should not have launched");
    });
});