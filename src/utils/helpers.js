export function isContestOver(currentTime, seasonEndDate) {
    if (!seasonEndDate) return false;
    const now = new Date(currentTime);
    const end = new Date(seasonEndDate);
    return now > end;
}

export function isRegistrationClosed(currentTime, cutoffDate) {
    if (!cutoffDate) return true; // Default to closed if no date set
    const now = new Date(currentTime);
    const cutoff = new Date(cutoffDate);
    return now > cutoff;
}

export function isContestEntryOpen(currentTime) {
    const now = new Date(currentTime);
    const currentYear = now.getFullYear();
    const startGate = new Date(currentYear, 0, 2);
    startGate.setHours(0, 0, 0, 0);
    return now >= startGate;
}

export function parseRows (valueSet) {
    if (!valueSet?.values) return [];
    const [headers, ...rows] = valueSet.values;
    return rows.map(row => Object.fromEntries(headers.map((h, i) => [h.toLowerCase(), row[i] || null])));
};

export const SHEETS = {
    CONTROLS: 'Controls',
    CONTESTANTS: 'Contestants',
    USERS: 'Users',
    BENCHMARKS: 'Benchmarks',
    PRIZES: 'Prizes',
    RECORDS: 'Records',
    WINNERS: 'Winners',
};

export function getRange(sheetName, columns = 'A:Z') { return `${sheetName}!${columns}` };