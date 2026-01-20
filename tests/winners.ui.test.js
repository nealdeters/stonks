const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { launchBrowser } = require('./helpers/browser');

describe('Winners UI Integration', () => {
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

    test('should render the podium from mock API data', async () => {
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.url().includes('fetch-data')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        sheetData: {
                            controls: { title: "Test Championship" },
                            winners: [
                                {
                                    year: "2025",
                                    first_user_name: "Champion User",
                                    first_user_uuid: "uuid-123",
                                    second_user_name: "Runner Up",
                                    second_user_uuid: "uuid-456",
                                    third_user_name: "Bronze Medal",
                                    third_user_uuid: "uuid-789"
                                }
                            ]
                        }
                    })
                });
            } else {
                request.continue();
            }
        });

        const filePath = `file://${path.join(__dirname, '../winners.html')}`;
        await page.goto(filePath, { waitUntil: 'networkidle0' });

        const headerText = await page.$eval('header h1', el => el.innerText);
        assert.strictEqual(headerText.toUpperCase(), 'TEST CHAMPIONSHIP', "Header should sync with control title");

        const firstPlace = await page.$eval('#winners-body', el => el.innerText);
        assert.ok(firstPlace.includes('Champion User'), "Should render the 1st place winner name");
        assert.ok(firstPlace.includes('2025'), "Should render the year");

        const link = await page.$eval('a[href*="uuid-123"]', el => el.href);
        assert.ok(link.includes('/stats?uuid=uuid-123'), "Link should contain correct UUID");
    });

    test('displays "History in the making" when winners list is empty', async () => {
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.url().includes('fetch-data')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ sheetData: { winners: [] } })
                });
            } else { request.continue(); }
        });

        await page.goto(`file://${path.join(__dirname, '../winners.html')}`, { waitUntil: 'networkidle0' });

        const content = await page.$eval('#winners-body', el => el.innerText);
        assert.ok(content.toUpperCase().includes('HISTORY IN THE MAKING'));
    });

    test('renders empty slot div when a name is missing', async () => {
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.url().includes('fetch-data')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        sheetData: {
                            winners: [{ year: "2024", first_user_name: "Solo Winner", first_user_uuid: "uuid-1" }]
                        }
                    })
                });
            } else { request.continue(); }
        });

        await page.goto(`file://${path.join(__dirname, '../winners.html')}`, { waitUntil: 'networkidle0' });

        const emptySlots = await page.$$('.hidden.md\\:block');
        assert.ok(emptySlots.length >= 2, "Should render placeholder divs for missing rankings");
    });
});