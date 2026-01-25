import { schedule } from '@netlify/functions';
import { sendReminder } from '../lib/reminders.js';

export const handler = schedule("0 23 15 1 *", sendReminder);