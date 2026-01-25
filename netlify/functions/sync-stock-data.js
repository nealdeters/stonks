import { schedule } from '@netlify/functions';
import { syncStockData } from '../lib/stock-data.js';

export const handler = schedule("*/10 * * * *", syncStockData);