import { JWT } from 'google-auth-library';
import googleSheetsPkg from '@googleapis/sheets';

const googleSheets = googleSheetsPkg.default || googleSheetsPkg;

const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/spreadsheets.readonly'
];

/**
 * Create an authenticated JWT client for Google Sheets API
 * @returns {Promise<JWT>} Authenticated JWT client
 */
export async function getGoogleAuth() {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    
    // Handle different key formats:
    // 1. Keys stored with literal \n (from .env files)
    // 2. Keys already with actual newlines
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    return new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: privateKey,
        scopes: GOOGLE_SCOPES,
    });
}

/**
 * Get an authenticated Google Sheets client
 * @returns {Promise<Object>} Authenticated sheets client
 */
export async function getSheetsClient() {
    const auth = await getGoogleAuth();
    return googleSheets.sheets({ version: 'v4', auth });
}

/**
 * Validate required environment variables for Google Sheets access
 * @throws {Error} If required env vars are missing
 */
export function validateGoogleEnvVars() {
    const required = ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'SHEET_ID'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }
}
