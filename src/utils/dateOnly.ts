export function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Interpret a date-only (YYYY-MM-DD) as UTC midnight.
 * This prevents timezone drift.
 */
export function ymdToUtcDate(ymd: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) throw new Error("Invalid date format");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Convert any Date/ISO input into YYYY-MM-DD using UTC.
 */
export function toYmdUtc(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * If input is YYYY-MM-DD => UTC midnight
 * Else (ISO) => convert to UTC date-only then UTC midnight
 */
export function normalizeToUtcMidnight(input: string): Date {
  if (isYmd(input)) return ymdToUtcDate(input);
  return ymdToUtcDate(toYmdUtc(input));
}
