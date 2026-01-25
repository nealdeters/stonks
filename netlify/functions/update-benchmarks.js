import { schedule } from '@netlify/functions';
import { updateBenchmarks } from '../lib/benchmarks.js';

export const handler = schedule("0 21 * * *", updateBenchmarks);