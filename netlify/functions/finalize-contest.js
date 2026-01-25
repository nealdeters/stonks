import { schedule } from '@netlify/functions';
import { finalizeContest } from '../lib/contest.js';

export const handler = schedule("0 0 * * 1", finalizeContest);