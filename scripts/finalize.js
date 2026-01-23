import { google } from 'googleapis';
import axios from 'axios';
import 'dotenv/config';
import { SHEETS, getRange, parseRows } from '../src/utils/helpers.js';

export async function run(sheetsOverride) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = sheetsOverride || google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SHEET_ID;
  const apiKey = process.env.FINNHUB_KEY;

  const controlsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getRange(SHEETS.CONTROLS),
  });
  
  const controls = parseRows(controlsRes.data)[0];
  if (!controls || !controls.end) {
      console.error("No end date found in Controls.");
      return;
  }

  const endDate = new Date(controls.end);
  const today = new Date();

  endDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);

  if (today < endDate) {
    console.log(`Contest is still active (Ends: ${endDate.toDateString()}). Skipping archival.`);
    return;
  }

  console.log("Contest ended. Archiving results and resetting board...");

  const contestantsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: getRange(SHEETS.CONTESTANTS)
  });
  const contestants = parseRows(contestantsRes.data);

  if (contestants.length === 0) {
      console.log("No contestants to archive.");
      return;
  }

  console.log(`Fetching final market prices for ${contestants.length} contestants...`);
  
  const finalResults = await Promise.all(contestants.map(async (p) => {
      let finalPrice = 0;
      try {
        const priceRes = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${p.ticker}&token=${apiKey}`);
        finalPrice = priceRes.data.c || 0;
      } catch (err) {
          console.error(`Failed to fetch price for ${p.ticker}: ${err.message}`);
      }
      
      const capital = parseFloat(p.capital) || 0;
      const shares = parseFloat(p.shares) || 0;
      const currentMarketValue = finalPrice * shares;
      const gainPercentage = capital > 0 ? ((currentMarketValue - capital) / capital) * 100 : 0;
      
      return { ...p, finalPrice, gainPercentage, capital, cost: parseFloat(p.cost), shares };
  }));

  const sorted = finalResults.sort((a, b) => b.gainPercentage - a.gainPercentage);

  const archiveRows = sorted.map((p, index) => [
      p.user_uuid,
      p.name,
      p.ticker,
      p.capital,
      p.cost,
      p.shares,
      p.finalPrice,
      `${p.gainPercentage.toFixed(2)}%`,
      index + 1,
      new Date().getFullYear().toString()
  ]);

  await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: getRange(SHEETS.RECORDS),
      valueInputOption: 'USER_ENTERED',
      resource: { values: archiveRows }
  });

  await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${SHEETS.CONTESTANTS}!A2:Z` 
  });

  console.log(`Finalized: ${archiveRows.length} contestants archived.`);
}

if (process.argv[1]?.includes('finalize.js')) {
  run().catch(console.error);
}