const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { launchBrowser } = require('./helpers/browser');

describe('Entry Form UI', () => {
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

    test('successfully submits and redirects', async () => {
        // 1. Mock the success response
        page.on('request', (request) => {
            if (request.url().includes('process-entry')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: "Success" })
                });
            } else {
                request.continue();
            }
        });

        const filePath = `file://${path.join(__dirname, '../submit.html')}`;
        await page.goto(filePath);

        // 2. Fill out the form
        await page.type('#name', 'Jane Doe');
        await page.type('#email', 'jane@example.com');
        await page.type('#ticker', 'AAPL');
        await page.type('#secret', 'password123');

        // 3. Submit
        await Promise.all([
            page.click('#submit-btn'),
            page.waitForNavigation() // Wait for redirect
        ]);

        // 4. Assert URL changed to home with success param
        const url = page.url();
        assert.ok(url.includes('/?submitted=true'), "Should redirect to home page on success");
    });

    test('displays error message on failed submission', async () => {
        const errorMessage = "INVALID ACCESS SECRET";
        
        // 1. Mock the failure response
        page.on('request', (request) => {
            if (request.url().includes('process-entry')) {
                request.respond({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: errorMessage })
                });
            } else {
                request.continue();
            }
        });

        const filePath = `file://${path.join(__dirname, '../submit.html')}`;
        await page.goto(filePath);

        // 2. Fill and Submit
        await page.type('#name', 'Jane Doe');
        await page.type('#email', 'jane@example.com');
        await page.type('#ticker', 'AAPL');
        await page.type('#secret', 'wrong_secret');
        await page.click('#submit-btn');

        // 3. Wait for the error message to be visible
        await page.waitForSelector('#error-message:not(.hidden)');
        
        // 4. Assertions
        const displayedError = await page.$eval('#error-message', el => el.innerText);
        assert.strictEqual(displayedError, errorMessage, "Displayed error should match API response");

        const isBtnDisabled = await page.$eval('#submit-btn', el => el.disabled);
        assert.strictEqual(isBtnDisabled, false, "Button should be re-enabled after error");
    });
});