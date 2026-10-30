// Months as "2026-10" keys, in UTC: the usage report runs from the 1st, 00:00 UTC.

// Months shown in the usage report, ending with the month reported on.
export const REPORT_MONTHS = 6;

// The month to report on: the one before now.
export function reportMonth(now) {
  return monthKey(now.getUTCFullYear(), now.getUTCMonth() - 1);
}

// The REPORT_MONTHS months ending with month, oldest first.
export function reportMonths(month) {
  const [year, number] = month.split("-").map(Number);
  return Array.from({ length: REPORT_MONTHS }, (_, offset) => monthKey(year, number - REPORT_MONTHS + offset));
}

// The month after month.
export function nextMonth(month) {
  const [year, number] = month.split("-").map(Number);
  return monthKey(year, number);
}

// The key for a year and a 0-based month, which may run past either end of the year.
function monthKey(year, monthIndex) {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
