import type { Locale } from "@/src/i18n/messages";

export const formatMonthLabel = (locale: Locale, month: string) => {
  const date = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return month;
  const label = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);
  if (locale === "es" && label.length > 0) {
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return label;
};
