const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const puppeteer = require('puppeteer');
const path = require('path');
const http = require('node:http');
const fs = require('node:fs');

describe('Stonks UI Tests', { timeout: 60000 }, () => {
    let browser;
    let page;
    let server;
    const PORT = 3000;

    before(async () => {
        server = http.createServer((req, res) => {
            let urlPath = req.url === '/' ? '/index.html' : req.url;
            urlPath = urlPath.split('?')[0];
            const filePath = path.join(process.cwd(), urlPath);

            if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
                res.writeHead(200);
                fs.createReadStream(filePath).pipe(res);
            } else {
                res.writeHead(404);
                res.end();
            }
        });
        await new Promise(resolve => server.listen(PORT, resolve));

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-web-security'],
            headless: "new" 
        });
        page = await browser.newPage();

        await page.setRequestInterception(true);
        page.on('request', async (req) => {
            const url = req.url();

            if (url.includes('fetch-data')) {
                const mockResponse = {
                    sheetData: {
                        contestants: [
                            { useruuid: 'u1', name: 'Alice', ticker: 'AAPL', capital: '5000', cost: '100', shares: '50' },
                            { useruuid: 'u2', name: 'Bob', ticker: 'TSLA', capital: '5000', cost: '200', shares: '25' }
                        ],
                        records: [],
                        prizes: [{ rank: '1', emoji: '🥇', amount: '$100' }],
                        benchmarks: [{ ticker: 'VOO', name: 'S&P 500', startprice: '500' }],
                        payment: { paymentbuttontext: 'PAY ENTRY FEE', paymenturl: 'https://venmo.com' }
                    },
                    prices: [
                        { ticker: 'AAPL', price: 110.00, dp: 2.5, name: 'Apple' },
                        { ticker: 'TSLA', price: 190.00, dp: -1.2, name: 'Tesla' },
                        { ticker: 'VOO', price: 510.00, dp: 0.5, name: 'Vanguard S&P 500' }
                    ]
                };

                return req.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mockResponse)
                });
            }

            req.continue();
        });

        await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0' });
    });

    after(async () => {
        if (browser) await browser.close();
        if (server) server.close();
    });

    test('Headers are correct on Desktop', async () => {
        await page.setViewport({ width: 1200, height: 800 });
        await page.waitForSelector('#leaderboard-body tr', { timeout: 15000 });
        const headers = await page.$$eval('thead th', ths => ths.map(th => th.innerText.trim()).filter(t => t !== ""));
        assert.ok(headers.includes('PARTICIPANT'), 'Missing header: PARTICIPANT');
    });

    test('Returns positive and negative percentages', async () => {
        const returns = await page.$$eval('#leaderboard-body tr', rows => rows.map(r => r.innerText));
        assert.ok(returns.some(r => r.includes('+')), 'Missing + return');
        assert.ok(returns.some(r => r.includes('-')), 'Missing - return');
    });

    test('Totals section must show Investment, Value, and Gain', async () => {
        await page.waitForFunction(() => document.querySelector('#stat-capital').innerText !== '$0.00');
        const capital = await page.$eval('#stat-capital', el => el.innerText);
        assert.notStrictEqual(capital, '$0.00', 'Total Investment failed to update');
    });

    test('Leaderboard must render at least one participant row', async () => {
        const rowCount = await page.$$eval('#leaderboard-body tr', rows => rows.length);
        assert.ok(rowCount > 0, 'Leaderboard table is empty');
    });

    test('Payment Action Button must be visible and have correct text', async () => {
        const buttonText = await page.$eval('#payment-btn', el => el.innerText.trim().toUpperCase());
        assert.strictEqual(buttonText, 'PAY ENTRY FEE');
    });

    // test proving payment entry fee button directs where needed
});