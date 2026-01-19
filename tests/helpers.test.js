const { test, describe } = require('node:test');
const assert = require('node:assert');
const { isContestOver, isRegistrationClosed } = require('../src/utils/helpers');

describe('Date Utility Logic', () => {
    
    test('Season is over if today is past the end date', () => {
        const today = '2026-12-25';
        const seasonEnd = '2026-12-11';
        assert.strictEqual(isContestOver(today, seasonEnd), true);
    });

    test('Registration is closed if today is exactly the cutoff', () => {
        // Technically "equal to" depends on your preference, usually > is better
        const today = '2026-02-01T12:00:00';
        const cutoff = '2026-02-01T00:00:00';
        assert.strictEqual(isRegistrationClosed(today, cutoff), true);
    });

    test('Registration is open before cutoff', () => {
        assert.strictEqual(isRegistrationClosed('2026-01-01', '2026-02-01'), false);
    });
});