"use client";

import { formatMonthLabel } from "@/src/utils/month";
import type { Locale } from "@/src/i18n/messages";

type MonthPickerProps = {
  month: string;
  onChange: (value: string) => void;
  label: string;
  helperText?: string;
  locale: Locale;
};

export function MonthPicker({ month, onChange, label, helperText, locale }: MonthPickerProps) {
  const resolvedHelper = helperText ?? formatMonthLabel(month, locale);

  return (
    <label className="form-control">
      <span className="label-text text-xs">{label}</span>
      <input
        className="input input-bordered"
        type="month"
        value={month}
        onChange={(event) => onChange(event.target.value)}
      />
      {resolvedHelper ? <span className="mt-1 text-xs opacity-60">{resolvedHelper}</span> : null}
    </label>
  );
}
