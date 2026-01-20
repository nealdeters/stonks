const path = require('path');
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const { launchBrowser } = require('./helpers/browser');

const MOCK_DATA = {
    sheetData: {
        records: [
            { user_uuid: 'u1', name: 'Alice', percent_gain: '100.0', place: '1', year: '2023' },
            { user_uuid: 'u2', name: 'Bob', percent_gain: '50.0', place: '2', year: '2023' },
            { user_uuid: 'u2', name: 'Bob', percent_gain: '50.0', place: '1', year: '2022' },
            { user_uuid: 'u3', name: 'Charlie', percent_gain: '-10.0', place: '3', year: '2023' }
        ],
        controls: { title: 'Test Cup' }
    }
};

describe('Performers UI', () => {
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

    test('Renders and Sorts Correctly', async () => {
        await page.setRequestInterception(true);
        page.on('request', req => {
            if (req.url().includes('fetch-data')) {
                req.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(MOCK_DATA)
                });
            } else {
                req.continue();
            }
        });

        const filePath = path.join(__dirname, '../performers.html');
        await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });

        const title = await page.$eval('header h1', el => el.innerText);
        assert.strictEqual(title, 'TEST CUP', 'Header title should be updated from controls');

        const rows = await page.$$('tbody tr');
        assert.strictEqual(rows.length, 3, 'Should render 3 rows for 3 unique users');

        const firstRowName = await rows[0].$eval('td:nth-child(2)', el => el.innerText);
        const firstRowAvg = await rows[0].$eval('td:nth-child(5)', el => el.innerText);
        
        assert.ok(firstRowName.includes('Alice'), 'First row should be Alice (100% avg)');
        assert.ok(firstRowAvg.includes('+100.00%'), 'First row avg should be +100.00%');
    });
});