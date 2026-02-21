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
    
    console.log('[Auth] Raw key length:', privateKey.length);
    console.log('[Auth] Key starts with:', privateKey.substring(0, 50).replace(/\n/g, '\\n'));
    console.log('[Auth] Contains literal \\\\n:', privateKey.includes('\\n'));
    console.log('[Auth] Contains actual newline:', privateKey.includes('\n'));
    
    // Handle various key formats:
    // Replace literal \n with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    
    console.log('[Auth] After replacement, starts with:', privateKey.substring(0, 50));
    
    // Ensure proper PEM format
    if (!privateKey.includes('-----BEGIN')) {
        console.error('[Auth] Key format issue - does not contain BEGIN marker');
        throw new Error('Private key does not appear to be in PEM format');
    }
    
    try {
        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: privateKey,
            scopes: GOOGLE_SCOPES,
        });
        
        // Force token refresh to test auth works
        await auth.getAccessToken();
        console.log('[Auth] JWT created and token obtained successfully');
        
        return auth;
    } catch (err) {
        console.error('[Auth] JWT creation failed:', err.message);
        throw err;
    }
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
