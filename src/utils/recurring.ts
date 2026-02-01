import { isYmd, toYmdUtc, ymdToUtcDate } from "@/src/utils/dateOnly";

type Frequency = "monthly" | "weekly";

type ComputeNextRunParams = {
  frequency: Frequency;
  interval: number;
  dayOfMonth?: number;
  startDate: string;
  fromDate: string;
};

function toUtcDate(value: string): Date {
  const normalized = isYmd(value) ? value : toYmdUtc(value);
  return ymdToUtcDate(normalized);
}

function addMonthsUtc(base: Date, months: number, dayOfMonth: number): Date {
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(dayOfMonth, lastDay);
  return new Date(Date.UTC(targetYear, targetMonth, day));
}

export function computeNextRunAt({
  frequency,
  interval,
  dayOfMonth,
  startDate,
  fromDate,
}: ComputeNextRunParams): string {
  const from = toUtcDate(fromDate);
  const start = toUtcDate(startDate);

  if (frequency === "weekly") {
    from.setUTCDate(from.getUTCDate() + interval * 7);
    return toYmdUtc(from);
  }

  const targetDay = dayOfMonth ?? start.getUTCDate();
  const next = addMonthsUtc(from, interval, targetDay);
  return toYmdUtc(next);
}
