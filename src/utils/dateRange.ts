import type { Locale } from "@/src/i18n/messages";
import { isYmd, toYmdUtc, ymdToUtcDate } from "@/src/utils/dateOnly";

export type DateRange = { start: string | null; end: string | null };

export type DateRangePresetKey =
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "allHistory";

const addUtcDays = (date: Date, days: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));

const startOfWeekUtc = (date: Date) => {
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addUtcDays(date, mondayOffset);
};

const endOfWeekUtc = (date: Date) => addUtcDays(startOfWeekUtc(date), 6);

const startOfMonthUtc = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const endOfMonthUtc = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));

const startOfYearUtc = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

const endOfYearUtc = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), 11, 31));

export function formatRangeLabel(range: DateRange, locale: Locale) {
  if (!range.start || !range.end) return "All history";
  if (!isYmd(range.start) || !isYmd(range.end)) return "All history";
  const startDate = ymdToUtcDate(range.start);
  const endDate = ymdToUtcDate(range.end);
  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}

export function getPresetRange(preset: DateRangePresetKey, nowInput = new Date()): DateRange {
  const now = new Date(
    Date.UTC(nowInput.getUTCFullYear(), nowInput.getUTCMonth(), nowInput.getUTCDate())
  );

  if (preset === "allHistory") return { start: null, end: null };

  if (preset === "thisWeek") {
    return { start: toYmdUtc(startOfWeekUtc(now)), end: toYmdUtc(endOfWeekUtc(now)) };
  }

  if (preset === "lastWeek") {
    const thisWeekStart = startOfWeekUtc(now);
    const lastWeekStart = addUtcDays(thisWeekStart, -7);
    return { start: toYmdUtc(lastWeekStart), end: toYmdUtc(addUtcDays(lastWeekStart, 6)) };
  }

  if (preset === "thisMonth") {
    return { start: toYmdUtc(startOfMonthUtc(now)), end: toYmdUtc(endOfMonthUtc(now)) };
  }

  if (preset === "lastMonth") {
    const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return {
      start: toYmdUtc(startOfMonthUtc(lastMonthDate)),
      end: toYmdUtc(endOfMonthUtc(lastMonthDate)),
    };
  }

  if (preset === "thisYear") {
    return { start: toYmdUtc(startOfYearUtc(now)), end: toYmdUtc(endOfYearUtc(now)) };
  }

  const lastYearDate = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
  return { start: toYmdUtc(startOfYearUtc(lastYearDate)), end: toYmdUtc(endOfYearUtc(lastYearDate)) };
}

export function shiftRange(range: DateRange, direction: -1 | 1): DateRange {
  if (!range.start || !range.end) return range;
  const startDate = ymdToUtcDate(range.start);
  const endDate = ymdToUtcDate(range.end);
  const rangeLengthDays = Math.max(
    1,
    Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1
  );
  const shiftDays = rangeLengthDays * direction;
  return {
    start: toYmdUtc(addUtcDays(startDate, shiftDays)),
    end: toYmdUtc(addUtcDays(endDate, shiftDays)),
  };
}
