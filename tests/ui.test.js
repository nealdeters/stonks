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
        // Start Local Server
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
            headless: true 
        });
        page = await browser.newPage();

        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message));

        await page.setRequestInterception(true);
        page.on('request', async (req) => {
            const url = req.url();

            if (url.includes('get-prices')) {
                // Handshake mock providing the necessary config object
                const body = !url.includes('tickers=') 
                    ? { 
                        sheetId: 'MOCK_ID', 
                        config: { 
                            paymentButtonText: 'Pay Entry Fee', 
                            paymentUrl: 'https://venmo.com/test' 
                        } 
                      }
                    : { prices: [
                        { ticker: 'AAPL', price: 150.00, dp: 5.0 },
                        { ticker: 'TSLA', price: 50.00, dp: -2.0 },
                        { ticker: 'SPY', price: 420.00, dp: 0.5 }
                      ]};
                return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
            }

            if (url.includes('gviz/tq')) {
                let data = { table: { cols: [], rows: [] } };
                if (url.includes('Participants')) {
                    data.table = {
                        cols: [{label: 'Name'}, {label: 'Ticker'}, {label: 'Shares'}, {label: 'Cost'}, {label: 'Capital'}],
                        rows: [
                            { c: [{v: 'Alice'}, {v: 'AAPL'}, {v: 10}, {v: 100}, {v: 1000}] },
                            { c: [{v: 'Bob'}, {v: 'TSLA'}, {v: 10}, {v: 100}, {v: 1000}] }
                        ]
                    };
                } else if (url.includes('Benchmarks')) {
                    data.table = {
                        cols: [{label: 'Ticker'}, {label: 'Name'}, {label: 'startprice'}],
                        rows: [{ c: [{v: 'SPY'}, {v: 'S&P 500'}, {v: 400}] }]
                    };
                }
                
                const jsonString = JSON.stringify(data);
                const gvizResponse = `/*O_o*/\ngoogle.visualization.Query.setResponse(${jsonString});`;
                
                return req.respond({ 
                    status: 200, 
                    contentType: 'text/javascript', 
                    body: gvizResponse 
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
        await page.waitForSelector('#leaderboard-body tr', { timeout: 10000 });
        
        const headers = await page.$$eval('thead th', ths => 
            ths.map(th => th.innerText.trim()).filter(t => t !== "")
        );
        
        assert.ok(headers.includes('PARTICIPANT'), 'Missing header: PARTICIPANT');
    });

    test('Returns positive and negative percentages', async () => {
        const returns = await page.$$eval('#leaderboard-body tr td:last-child p', p => 
            p.map(el => el.innerText.trim())
        );
        assert.ok(returns.some(r => r.includes('+')), 'Missing + return');
        assert.ok(returns.some(r => r.includes('-')), 'Missing - return');
    });

    test('Benchmarks container must exist and be visible', async () => {
        const benchmarks = await page.$('#benchmarks-container');
        assert.ok(benchmarks, 'CRITICAL: Benchmarks container is missing from the DOM');
        const isVisible = await benchmarks.boundingBox();
        assert.ok(isVisible, 'CRITICAL: Benchmarks container is hidden');
    });

    test('Totals section must show Investment, Value, and Gain', async () => {
        const capital = await page.$eval('#stat-capital', el => el.innerText);
        const value = await page.$eval('#stat-value', el => el.innerText);
        const gain = await page.$eval('#stat-gain', el => el.innerText);

        assert.notStrictEqual(capital, '$0.00', 'Total Investment failed to update');
        assert.notStrictEqual(value, '$0.00', 'Total Value failed to update');
        assert.ok(gain.includes('%'), 'Total % Return is missing percentage symbol');
    });

    test('Leaderboard must render at least one participant row', async () => {
        await page.waitForSelector('#leaderboard-body tr');
        const rowCount = await page.$$eval('#leaderboard-body tr', rows => rows.length);
        assert.ok(rowCount > 0, 'Leaderboard table is empty');
    });

    test('Payment Action Button must be visible and have correct text', async () => {
        const payBtn = await page.$('#payment-btn');
        assert.ok(payBtn, 'CRITICAL: Payment button (#payment-btn) is missing from the DOM');

        const isVisible = await page.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        }, payBtn);
        assert.ok(isVisible, 'CRITICAL: Payment button is present but not visible to the user');

        // FIXED: Use .toUpperCase() to handle Tailwind's 'uppercase' class in tests
        const buttonText = await page.$eval('#payment-btn', el => el.innerText.trim().toUpperCase());
        assert.strictEqual(buttonText, 'PAY ENTRY FEE', 'Payment button text does not match the Sheet config');
    });

    test('Payment Button should trigger a redirect on click', async () => {
        const isRedirectAttempted = await page.evaluate(() => {
            try {
                // Ensure the function is defined globally in app.js
                if (typeof triggerPayment === 'function') {
                    triggerPayment();
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            }
        });
        
        assert.ok(isRedirectAttempted, 'Payment button click failed to trigger the triggerPayment function');
    });
});