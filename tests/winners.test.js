const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { launchBrowser } = require('./helpers/browser');

describe('Winners Display Logic', () => {
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

    test('renders winners podium correctly from valid API data', async () => {
        page.on('request', (request) => {
            if (request.url().includes('fetch-data')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        sheetData: {
                            controls: { title: "Stonks Archives" },
                            winners: [
                                {
                                    year: "2025",
                                    first_user_name: "Winner One",
                                    first_user_uuid: "uuid-1",
                                    second_user_name: "Winner Two",
                                    second_user_uuid: "uuid-2",
                                    third_user_name: "Winner Three",
                                    third_user_uuid: "uuid-3"
                                }
                            ]
                        }
                    })
                });
            } else { request.continue(); }
        });

        await page.goto(`file://${path.join(__dirname, '../winners.html')}`, { waitUntil: 'networkidle0' });

        const firstPlaceName = await page.$eval('#winners-body', el => el.innerText);
        assert.ok(firstPlaceName.toUpperCase().includes('WINNER ONE'));
        assert.ok(firstPlaceName.includes('2025'));
    });

    test('displays "History in the making" when winners list is empty', async () => {
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