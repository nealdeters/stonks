const axios = require('axios');
const { JWT } = require('google-auth-library');
const googleSheets = require('@googleapis/sheets');

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
};

exports.handler = async (event) => {
    // Standard fetch POSTs are often url-encoded; let's handle both
    let formData;
    try {
        formData = event.isBase64Encoded 
            ? Object.fromEntries(new URLSearchParams(Buffer.from(event.body, 'base64').toString()))
            : JSON.parse(event.body);
    } catch (e) {
        formData = Object.fromEntries(new URLSearchParams(event.body));
    }

    const { name, email, ticker, secret } = formData;
    
    const SHEET_ID = process.env.SHEET_ID;
    const FINNHUB_KEY = process.env.FINNHUB_KEY;
    const GOOGLE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_KEY = process.env.GOOGLE_PRIVATE_KEY;
    const APP_SECRET = process.env.APP_SECRET;
    const INVESTMENT = 5000;

    if (!secret || secret !== APP_SECRET) {
        return { 
            statusCode: 401, 
            headers: HEADERS,
            body: JSON.stringify({ error: "Invalid Access Secret" }) 
        };
    }

    if (!GOOGLE_EMAIL || !GOOGLE_KEY) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Config Error" }) };
    }

    const auth = new JWT({
        email: GOOGLE_EMAIL,
        key: GOOGLE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = googleSheets.sheets({ version: 'v4', auth });

    try {
        // 2. User Logic
        const usersTab = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Users!A:Z' });
        const users = usersTab.data.values || [];
        let userUuid = users.find(row => row[2]?.toLowerCase() === email?.toLowerCase())?.[0];
        
        if (!userUuid) {
            userUuid = require('crypto').randomUUID();
            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: 'Users!A:C',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[userUuid, name, email]] },
            });
        }

        // 3. Duplicate Check
        const contestantsTab = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Contestants!F:F' });
        if ((contestantsTab.data.values || []).flat().includes(userUuid)) {
            return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Already entered!" }) };
        }

        // 4. Price & Calculation
        const quote = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${ticker.toUpperCase()}&token=${FINNHUB_KEY}`);
        const price = quote.data.c;
        if (!price) throw new Error("Ticker not found");

        const shares = INVESTMENT / price;
        const nameFormula = `=XLOOKUP("${userUuid}", Users!A:A, Users!B:B)`;
        
        // 5. Relational Append
        // Column Order: Name, Ticker, Shares, Cost, Capital, user_uuid
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Contestants!A:F',
            valueInputOption: 'USER_ENTERED',
            resource: { 
                values: [[
                    userUuid,
                    nameFormula, 
                    ticker.toUpperCase(),
                    INVESTMENT,
                    price,
                    shares,
                ]] 
            },
        });

        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ message: "Success" }) };

    } catch (err) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
    }
};