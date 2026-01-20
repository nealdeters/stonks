const axios = require('axios');
const { JWT } = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');
const crypto = require('crypto');
const { SHEETS, getRange, isRegistrationClosed } = require('../../src/utils/helpers');

const HEADERS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const INVESTMENT = 5000;

exports.handler = async (event) => {
    let formData;
    try {
        if (event.isBase64Encoded) {
            formData = Object.fromEntries(new URLSearchParams(Buffer.from(event.body, 'base64').toString()));
        } else {
            formData = JSON.parse(event.body);
        }
    } catch (e) {
        formData = Object.fromEntries(new URLSearchParams(event.body));
    }

    const { name, email, ticker, secret } = formData;
    
    const SHEET_ID = process.env.SHEET_ID;
    const APP_SECRET = process.env.APP_SECRET;

    const auth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    if (!secret || secret !== APP_SECRET) {
        return { 
            statusCode: 422, 
            headers: HEADERS, 
            body: JSON.stringify({ error: "Invalid Secret" }) 
        };
    }

    const sheets = googleSheets.sheets({ version: 'v4', auth });
    const ranges = [
        getRange(SHEETS.USERS),
        getRange(SHEETS.CONTESTANTS),
        getRange(SHEETS.CONTROLS),
    ];

    try {
        const data = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: SHEET_ID,
            ranges: ranges
        });

        const users = data.data.valueRanges[0].values || [];
        const contestants = data.data.valueRanges[1].values || [];
        const controlData = data.data.valueRanges[2].values || [];

        let controls = {};
        if (controlData.length >= 2) {
            const controlHeaders = controlData[0];
            const values = controlData[1];
            controlHeaders.forEach((header, i) => {
                const key = header.toLowerCase().trim().replace(/[\s_]/g, '');
                controls[key] = values[i];
            });
        }
  
        if (!ticker) {
            return { statusCode: 422, headers: HEADERS, body: JSON.stringify({ error: "Ticker symbol is required." }) };
        }

        if (isRegistrationClosed(new Date(), controls.cutoff)) {
            return { statusCode: 422, headers: HEADERS, body: JSON.stringify({ error: `Registration closed.` }) };
        }

        const userHeaders = users[0] || [];
        const emailIdx = userHeaders.indexOf('email');
        const userRow = users.find(u => u[emailIdx]?.toLowerCase() === email.toLowerCase());
        let userUuid = userRow ? userRow[0] : null;

        if (!userUuid) {
            userUuid = crypto.randomUUID();
            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: getRange(SHEETS.USERS),
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[userUuid, name, email]] }
            });
        }

        const isAlreadyContestant = contestants.some(c => c[0] === userUuid);
        
        if (isAlreadyContestant) {
            return { 
                statusCode: 422, 
                headers: HEADERS, 
                body: JSON.stringify({ error: "User already has an entry." }) 
            };
        }

        const contestantHeaders = contestants[0] || [];
        const tickerIdx = contestantHeaders.indexOf('ticker');       

        if (tickerIdx !== -1) {
            const isTickerTaken = contestants.slice(1).some(c => 
                c[tickerIdx]?.toString().toUpperCase() === ticker.toUpperCase()
            );
            
            if (isTickerTaken) {
                return { 
                    statusCode: 422, 
                    headers: HEADERS, 
                    body: JSON.stringify({ error: `The ticker ${ticker.toUpperCase()} has already been claimed.` }) 
                };
            }
        }

        const quote = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${ticker.toUpperCase()}&token=${process.env.FINNHUB_KEY}`);
        const price = quote.data.c;

        if (!price || price === 0) {
            return { statusCode: 422, headers: HEADERS, body: JSON.stringify({ error: `Ticker "${ticker}" not found or has no price.` }) };
        }

        const shares = INVESTMENT / price;

        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: getRange(SHEETS.CONTESTANTS),
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[userUuid, name, email, ticker.toUpperCase(), INVESTMENT, price, shares]] }
        });

        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ message: "Entry Recorded" }) };
    } catch (err) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
    }
};