const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const puppeteer = require('puppeteer');
const path = require('path');

describe('Stats Logic & Calculation', () => {
    let browser;
    let page;

    before(async () => {
        browser = await puppeteer.launch({ headless: 'new' });
    });

    after(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        page = await browser.newPage();
        await page.setRequestInterception(true);
    });

    test('should calculate correct career aggregates from raw record objects', async () => {
        const targetUuid = "neal-123";
        
        page.on('request', (request) => {
            if (request.url().includes('fetch-data')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        sheetData: {
                            records: [
                                { user_uuid: targetUuid, name: "Neal Deters", year: "2025", percent_gain: "20.00", place: "1", ticker: "BTC" },
                                { user_uuid: targetUuid, name: "Neal Deters", year: "2024", percent_gain: "10.00", place: "2", ticker: "ETH" },
                                { user_uuid: "other-user", name: "Someone Else", year: "2025", percent_gain: "5.00", place: "1", ticker: "TSLA" }
                            ]
                        }
                    })
                });
            } else { request.continue(); }
        });

        const filePath = `file://${path.join(__dirname, '../stats.html')}?uuid=${targetUuid}`;
        await page.goto(filePath, { waitUntil: 'networkidle0' });

        // Check new medal IDs instead of old stat-wins
        const goldCount = await page.$eval('#stat-gold', el => el.innerText);
        const silverCount = await page.$eval('#stat-silver', el => el.innerText);
        
        assert.strictEqual(goldCount, '1', "Logic: Gold count should be 1");
        assert.strictEqual(silverCount, '1', "Logic: Silver count should be 1");

        const avgReturn = await page.$eval('#stat-avg-return', el => el.innerText);
        assert.strictEqual(avgReturn, '15.00%', "Average calculation logic check");
    });
});