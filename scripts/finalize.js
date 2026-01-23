import { google } from 'googleapis';
import 'dotenv/config';

async function finalizeContest() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SHEET_ID;

  // 1. Check End Date from 'Controls'
  const controls = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Controls!B1',
  });

  const endDate = new Date(controls.data.values[0][0]);
  const today = new Date();

  if (today < endDate) {
    console.log("Contest is still active. Skipping archival.");
    return;
  }

  console.log("Contest ended. Archiving results and resetting board...");
  // Logic to move data from Contestants to Records and clear Contestants
}

finalizeContest().catch(console.error);