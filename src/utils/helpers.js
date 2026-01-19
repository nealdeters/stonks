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
};

function getRange(sheetName, columns = 'A:Z') { return `${sheetName}!${columns}` };

module.exports = { SHEETS, isContestOver, isRegistrationClosed, parseRows, getRange };