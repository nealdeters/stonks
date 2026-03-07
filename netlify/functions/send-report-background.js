import { schedule } from '@netlify/functions';
import { sendReport } from '../lib/reports.js';

export const handler = schedule("0 14 * * 1", async (event) => {
    console.log("Starting Scheduled Background Report...");
    return await sendReport(event);
});