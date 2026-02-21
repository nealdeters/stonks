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
    
    // Handle key format - Netlify may store multiline keys with literal \n
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }
    
    if (!privateKey.includes('-----BEGIN')) {
        throw new Error('Private key does not appear to be in PEM format');
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
 * @param {boolean} throwOnMissing - Whether to throw if vars are missing (default: true)
 * @throws {Error} If required env vars are missing and throwOnMissing=true
 */
export function validateGoogleEnvVars(throwOnMissing = true) {
    const requiredVars = ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'SHEET_ID'];
    const missing = requiredVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        if (throwOnMissing) {
            throw new Error(`Missing required env vars: ${missing.join(', ')}`);
        }
        return false;
    }
    return true;
}
