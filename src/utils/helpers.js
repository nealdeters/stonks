function isContestOver(currentTime, seasonEndDate) {
    if (!seasonEndDate) return false;
    const now = new Date(currentTime);
    const end = new Date(seasonEndDate);
    return now > end;
}

function isRegistrationClosed(currentTime, cutoffDate) {
    if (!cutoffDate) return true; // Default to closed if no date set
    const now = new Date(currentTime);
    const cutoff = new Date(cutoffDate);
    return now > cutoff;
}

function isContestEntryOpen(currentTime) {
    const now = new Date(currentTime);
    const currentYear = now.getFullYear();
    const startGate = new Date(currentYear, 0, 2);
    startGate.setHours(0, 0, 0, 0);
    return now >= startGate;
}

function parseRows (valueSet) {
    if (!valueSet?.values) return [];
    const [headers, ...rows] = valueSet.values;
    return rows.map(row => Object.fromEntries(headers.map((h, i) => [h.toLowerCase(), row[i] || null])));
};

const SHEETS = {
    CONTROLS: 'Controls',
    CONTESTANTS: 'Contestants',
    USERS: 'Users',
    BENCHMARKS: 'Benchmarks',
    PRIZES: 'Prizes',
    RECORDS: 'Records',
    WINNERS: 'Winners',
};

function getRange(sheetName, columns = 'A:Z') { return `${sheetName}!${columns}` };

if (typeof module !== 'undefined') {
    module.exports = { SHEETS, isContestOver, isRegistrationClosed, isContestEntryOpen, parseRows, getRange };
}
if (typeof window !== 'undefined') {
    window.SHEETS = SHEETS;
    window.isContestOver = isContestOver;
    window.isRegistrationClosed = isRegistrationClosed;
    window.isContestEntryOpen = isContestEntryOpen;
    window.parseRows = parseRows;
    window.getRange = getRange;
}