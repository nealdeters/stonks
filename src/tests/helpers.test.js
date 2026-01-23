import { describe, it, expect } from 'vitest';
import { isContestOver, isRegistrationClosed, isContestEntryOpen, parseRows, getRange } from '../utils/helpers';

describe('helpers', () => {
  it('isContestOver returns true if now is after end date', () => {
    const now = new Date('2024-01-01');
    const end = new Date('2023-12-31');
    expect(isContestOver(now, end)).toBe(true);
  });

  it('isRegistrationClosed returns true if now is after cutoff', () => {
    const now = new Date('2024-01-01');
    const cutoff = new Date('2023-12-31');
    expect(isRegistrationClosed(now, cutoff)).toBe(true);
  });

  it('isContestEntryOpen returns true if now is after Jan 2nd of current year', () => {
    const now = new Date('2024-01-03');
    expect(isContestEntryOpen(now)).toBe(true);
  });

  it('parseRows converts sheet data to objects', () => {
    const valueSet = {
      values: [
        ['Name', 'Ticker'],
        ['Alice', 'AAPL'],
        ['Bob', 'GOOGL']
      ]
    };
    const result = parseRows(valueSet);
    expect(result).toEqual([
      { name: 'Alice', ticker: 'AAPL' },
      { name: 'Bob', ticker: 'GOOGL' }
    ]);
  });

  it('getRange returns correct string', () => {
    expect(getRange('Users')).toBe('Users!A:Z');
    expect(getRange('Users', 'A:B')).toBe('Users!A:B');
  });
});