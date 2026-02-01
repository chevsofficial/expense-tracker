import type { Locale } from "@/src/i18n/messages";

export function monthRange(month: string): { start: string; end: string } {
  const [year, monthValue] = month.split("-");
  const y = Number(year);
  const m = Number(monthValue);
  const start = `${year}-${monthValue}-01`;

  const next = new Date(Date.UTC(y, m, 1));
  const nextYear = next.getUTCFullYear();
  const nextMonth = String(next.getUTCMonth() + 1).padStart(2, "0");
  const end = `${nextYear}-${nextMonth}-01`;

  return { start, end };
}

export function formatMonthLabel(month: string, locale: Locale) {
  const [yearValue, monthValue] = month.split("-");
  const date = new Date(Date.UTC(Number(yearValue), Number(monthValue) - 1, 1));
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
