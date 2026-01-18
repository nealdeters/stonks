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

            if (url.includes('get-prices')) {
                const body = !url.includes('tickers=') 
                    ? { 
                        sheetId: 'MOCK_ID', 
                        config: { paymentButtonText: 'Pay Entry Fee', paymentUrl: 'https://venmo.com/test' } 
                      }
                    : { prices: [
                        { ticker: 'AAPL', price: 150.00, dp: 5.0, name: 'Apple Inc' },
                        { ticker: 'TSLA', price: 50.00, dp: -2.0, name: 'Tesla' },
                        { ticker: 'SPY', price: 420.00, dp: 0.5, name: 'S&P 500' }
                      ]};
                return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
            }

            if (url.includes('gviz/tq')) {
                let data = { table: { cols: [], rows: [] } };
                // FIX: Match the "Contestants" tab name and "Flat Data" structure
                if (url.includes('Contestants')) {
                    data.table = {
                        cols: [{label: 'Name'}, {label: 'Ticker'}, {label: 'Shares'}, {label: 'Cost'}, {label: 'Capital'}, {label: 'user_uuid'}],
                        rows: [
                            { c: [{v: 'Alice'}, {v: 'AAPL'}, {v: 10}, {v: 100}, {v: 1000}, {v: 'u1'}] },
                            { c: [{v: 'Bob'}, {v: 'TSLA'}, {v: 10}, {v: 100}, {v: 1000}, {v: 'u2'}] }
                        ]
                    };
                } else if (url.includes('Benchmarks')) {
                    data.table = {
                        cols: [{label: 'Ticker'}, {label: 'Name'}, {label: 'startprice'}],
                        rows: [{ c: [{v: 'SPY'}, {v: 'S&P 500'}, {v: 400}] }]
                    };
                } else {
                    // Default for Records/Payment tabs
                    data.table = { cols: [{label: 'key'}], rows: [] };
                }
                
                const gvizResponse = `/*O_o*/\ngoogle.visualization.Query.setResponse(${JSON.stringify(data)});`;
                return req.respond({ status: 200, contentType: 'text/javascript', body: gvizResponse });
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
});