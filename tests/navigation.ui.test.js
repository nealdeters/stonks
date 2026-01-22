const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { launchBrowser } = require('./helpers/browser');

describe('Navigation Links UI', () => {
    let browser;
    let page;

    before(async () => {
        browser = await launchBrowser();
    });

    after(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        page = await browser.newPage();
    });

    const pages = ['index', 'submit', 'winners', 'performers', 'stats'];

    pages.forEach(filename => {
        test(`News link exists on ${filename}`, async () => {
            await page.setRequestInterception(true);
            page.on('request', req => {
                if (req.url().includes('/.netlify/functions/')) {
                    req.respond({ status: 200, body: '{}' });
                } else {
                    req.continue();
                }
            });

            let filePath = `file://${path.join(process.cwd(), filename + '.html')}`;
            if (filename === 'stats') {
                filePath += '?uuid=test-uuid';
            }
            await page.goto(filePath, { waitUntil: 'domcontentloaded' });

            await page.waitForSelector('footer');
            const newsLink = await page.$('footer a[href*="news"]');
            assert.ok(newsLink, `News link missing from footer in ${filename}`);
        });
    });
});