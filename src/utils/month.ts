import type { Locale } from "@/src/i18n/messages";

export function monthRange(month: string): { start: string; end: string } {
  const [year, monthValue] = month.split("-");
  const y = Number(year);
  const m = Number(monthValue);
  const start = `${year}-${monthValue}-01`;

  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const nextMStr = String(nextM).padStart(2, "0");
  const end = `${nextY}-${nextMStr}-01`;

  return { start, end };
}

export function formatMonthLabel(month: string, locale: Locale) {
  const [yearValue, monthValue] = month.split("-").map(Number);
  const date = new Date(Date.UTC(yearValue, monthValue - 1, 1));
  if (Number.isNaN(date.getTime())) return month;

  const label = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  if (locale === "es" && label.length > 0) {
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return label;
}
