const { test, describe } = require('node:test');
const assert = require('node:assert');
const { SHEETS, getRange, isContestOver, isRegistrationClosed } = require('../src/utils/helpers');

describe('Date Utility Logic', () => {
    
    test('Season is over if today is past the end date', () => {
        const today = '2026-12-25';
        const seasonEnd = '2026-12-11';
        assert.strictEqual(isContestOver(today, seasonEnd), true);
    });

    test('Registration is closed if today is exactly the cutoff', () => {
        const today = '2026-02-01T12:00:00';
        const cutoff = '2026-02-01T00:00:00';
        assert.strictEqual(isRegistrationClosed(today, cutoff), true);
    });

    test('Registration is open before cutoff', () => {
        assert.strictEqual(isRegistrationClosed('2026-01-01', '2026-02-01'), false);
    });

    describe('getRange', () => {
        test('should return the correct range with default columns', () => {
            const result = getRange(SHEETS.CONTROLS);
            assert.strictEqual(result, 'Controls!A:Z');
        });

        test('should return the correct range with custom columns', () => {
            const result = getRange(SHEETS.USERS, 'B:E');
            assert.strictEqual(result, 'Users!B:E');
        });

        test('should handle different sheet constants correctly', () => {
            assert.strictEqual(getRange(SHEETS.CONTESTANTS), 'Contestants!A:Z');
            assert.strictEqual(getRange(SHEETS.BENCHMARKS), 'Benchmarks!A:Z');
        });

        test('should handle manual string input if constant is not used', () => {
            const result = getRange('CustomSheet', 'A1:B10');
            assert.strictEqual(result, 'CustomSheet!A1:B10');
        });
    });
});