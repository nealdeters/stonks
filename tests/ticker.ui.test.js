const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { launchBrowser } = require('./helpers/browser');

describe('Ticker UI Component', () => {
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
        await page.setRequestInterception(true);
    });

    test('renders inside the header', async () => {
        page.on('request', (request) => {
            if (request.url().includes('fetch-data')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        sheetData: {
                            contestants: [
                                { name: "Ticker Master", ticker: "AAPL" }
                            ],
                            controls: {},
                            records: [],
                            prizes: [],
                            benchmarks: []
                        },
                        prices: [
                            { ticker: "AAPL", price: 150, dp: 1.5 }
                        ]
                    })
                });
            } else {
                request.continue();
            }
        });

        const filePath = `file://${path.join(process.cwd(), 'index.html')}`;
        await page.goto(filePath, { waitUntil: 'networkidle0' });

        const tickerInHeader = await page.$('header #stock-ticker-container');
        assert.ok(tickerInHeader, 'Ticker container should be a descendant of the header tag');

        const tickerItem = await page.$('#stock-ticker-inner span');
        assert.ok(tickerItem, 'Ticker items should be rendered');
    });
});