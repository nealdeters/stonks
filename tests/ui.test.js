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
            // Strip query params for file lookup
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

        // LOGGING: This will show exactly why the JS is failing in your terminal
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message));

        await page.setRequestInterception(true);
        page.on('request', async (req) => {
            const url = req.url();

            if (url.includes('get-prices')) {
                const body = !url.includes('tickers=') 
                    ? { sheetId: 'MOCK_ID' }
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
                
                // CRITICAL: This exact string padding (47 chars) is required by your parser
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
        // Give it 10s to render the table rows
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
});