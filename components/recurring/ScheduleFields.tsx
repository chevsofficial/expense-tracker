"use client";

import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type ScheduleFieldsProps = {
  locale: Locale;
  frequency: "monthly" | "weekly";
  interval: string;
  dayOfMonth: string;
  startDate: string;
  dayOfMonthOverridden: boolean;
  onFrequencyChange: (value: "monthly" | "weekly") => void;
  onIntervalChange: (value: string) => void;
  onDayOfMonthChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onOverrideChange: (value: boolean) => void;
};

export function ScheduleFields({
  locale,
  frequency,
  interval,
  dayOfMonth,
  startDate,
  dayOfMonthOverridden,
  onFrequencyChange,
  onIntervalChange,
  onDayOfMonthChange,
  onStartDateChange,
  onOverrideChange,
}: ScheduleFieldsProps) {
  const intervalValue = Number(interval);
  const helperText = locale === "es"
    ? `Cada ${intervalValue || 1} ${frequency === "monthly" ? "meses" : "semanas"}`
    : `Every ${intervalValue || 1} ${frequency === "monthly" ? "months" : "weeks"}`;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="form-control w-full">
        <span className="label-text">{t(locale, "recurring_frequency")}</span>
        <select
          className="select select-bordered"
          value={frequency}
          onChange={(event) => onFrequencyChange(event.target.value as "monthly" | "weekly")}
        >
          <option value="monthly">{t(locale, "recurring_frequency_monthly")}</option>
          <option value="weekly">{t(locale, "recurring_frequency_weekly")}</option>
        </select>
      </label>
      <label className="form-control w-full">
        <span className="label-text">{t(locale, "recurring_interval")}</span>
        <input
          className="input input-bordered"
          type="number"
          min="1"
          value={interval}
          onChange={(event) => onIntervalChange(event.target.value)}
        />
        <span className="mt-1 text-xs opacity-60">{helperText}</span>
      </label>
      <label className="form-control w-full">
        <span className="label-text">{t(locale, "recurring_start_date")}</span>
        <input
          className="input input-bordered"
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
        />
      </label>
      {frequency === "monthly" ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={dayOfMonthOverridden}
              onChange={(event) => onOverrideChange(event.target.checked)}
            />
            <span>{t(locale, "recurring_override_day")}</span>
          </label>
          {dayOfMonthOverridden ? (
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_day_of_month")}</span>
              <input
                className="input input-bordered"
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(event) => onDayOfMonthChange(event.target.value)}
              />
              <span className="mt-1 text-xs opacity-60">
                {t(locale, "recurring_day_of_month_help")}
              </span>
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
