const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { launchBrowser } = require('./helpers/browser');

describe('Participant Stats UI', () => {
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

    test('renders user-specific stats and calculates aggregates', async () => {
        const targetUuid = "user-123";
        
        page.on('request', (request) => {
            if (request.url().includes('fetch-data')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        sheetData: {
                            records: [
                                { user_uuid: targetUuid, name: "Neal Deters", year: "2025", percent_gain: "15.5", place: "1", ticker: "NVDA" }, // Gold
                                { user_uuid: targetUuid, name: "Neal Deters", year: "2024", percent_gain: "5.5", place: "2", ticker: "AAPL" },  // Silver
                                { user_uuid: targetUuid, name: "Neal Deters", year: "2023", percent_gain: "2.0", place: "3", ticker: "MSFT" },  // Bronze
                                { user_uuid: "other-user", name: "Someone Else", year: "2024", percent_gain: "50", place: "1", ticker: "TSLA" }
                            ]
                        }
                    })
                });
            } else { request.continue(); }
        });

        const filePath = `file://${path.join(__dirname, '../stats.html')}?uuid=${targetUuid}`;
        await page.goto(filePath, { waitUntil: 'networkidle0' });

        // Update assertions from #stat-wins to individual medals
        const gold = await page.$eval('#stat-gold', el => el.innerText);
        const silver = await page.$eval('#stat-silver', el => el.innerText);
        const bronze = await page.$eval('#stat-bronze', el => el.innerText);

        assert.strictEqual(gold, '1', "Should count 1 Gold");
        assert.strictEqual(silver, '1', "Should count 1 Silver");
        assert.strictEqual(bronze, '1', "Should count 1 Bronze");

        const seasons = await page.$eval('#stat-seasons', el => el.innerText);
        assert.strictEqual(seasons, '3', "Should count 3 seasons for target user");
    });
});