const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const puppeteer = require('puppeteer');
const path = require('path');

describe('News Page UI', () => {
    let browser;
    let page;

    before(async () => {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
    });

    after(async () => {
        await browser.close();
    });

    it('should render news cards when API returns data', async () => {
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (request.url().includes('/.netlify/functions/fetch-news')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        news: [
                            { 
                                ticker: 'AAPL', 
                                headline: 'Test Headline', 
                                summary: 'Test Summary', 
                                url: 'http://example.com', 
                                datetime: 1672531200, 
                                source: 'Test Source' 
                            }
                        ]
                    })
                });
            } else {
                request.continue();
            }
        });

        const filePath = 'file://' + path.resolve(__dirname, '../news.html');
        await page.goto(filePath, { waitUntil: 'networkidle0' });

        await page.waitForSelector('#news-body h3', { timeout: 2000 });

        const headline = await page.$eval('#news-body h3', el => el.textContent.trim());
        assert.strictEqual(headline, 'Test Headline');

        const ticker = await page.$eval('#news-body a span', el => el.textContent.trim());
        assert.strictEqual(ticker, 'AAPL');
    });
});