import { schedule } from '@netlify/functions';
import { syncNews } from '../lib/news.js';

export const handler = schedule("*/30 * * * *", syncNews);