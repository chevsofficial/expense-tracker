const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const isDateOnlyString = (value: string) => DATE_ONLY_REGEX.test(value);

export const parseDateOnly = (value: string) => {
  if (!isDateOnlyString(value)) return null;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;
  return { y: year, m: month, d: day };
};

export const toDateOnlyString = (value: Date) => {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const dateOnlyToDate = (value: string) => {
  const parts = parseDateOnly(value);
  if (!parts) return null;
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
};

export const addDaysDateOnly = (base: string, days: number) => {
  const date = dateOnlyToDate(base);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnlyString(date);
};

export const addMonthsDateOnly = (base: string, months: number, dayOfMonth: number) => {
  const parts = parseDateOnly(base);
  if (!parts) return null;
  const target = new Date(Date.UTC(parts.y, parts.m - 1 + months, 1));
  const daysInMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const day = Math.min(dayOfMonth, daysInMonth);
  return toDateOnlyString(new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day)));
};
