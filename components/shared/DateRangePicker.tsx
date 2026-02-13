"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/src/i18n/messages";
import {
  formatRangeLabel,
  getPresetRange,
  shiftRange,
  type DateRange,
  type DateRangePresetKey,
} from "@/src/utils/dateRange";

type Preset = { key: DateRangePresetKey; label: string };

const PRESETS: Preset[] = [
  { key: "thisWeek", label: "This week" },
  { key: "lastWeek", label: "Last week" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "thisYear", label: "This year" },
  { key: "lastYear", label: "Last year" },
  { key: "allHistory", label: "All history" },
];

export type DateRangeValue = DateRange;

export type DateRangePickerProps = {
  locale: Locale;
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  className?: string;
};

export function DateRangePicker({ locale, value, onChange, className }: DateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<string>(value.start ?? "");
  const [draftEnd, setDraftEnd] = useState<string>(value.end ?? "");

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const label = useMemo(() => formatRangeLabel(value, locale), [locale, value]);
  const hasBoundedRange = Boolean(value.start && value.end);
  const invalidRange = Boolean(draftStart && draftEnd && draftStart > draftEnd);

  const openPicker = () => {
    setDraftStart(value.start ?? "");
    setDraftEnd(value.end ?? "");
    setOpen((current) => !current);
  };

  const applyDraft = () => {
    if (invalidRange) return;
    onChange({
      start: draftStart || null,
      end: draftEnd || null,
    });
    setOpen(false);
  };

  const applyPreset = (preset: DateRangePresetKey) => {
    const next = getPresetRange(preset);
    setDraftStart(next.start ?? "");
    setDraftEnd(next.end ?? "");
  };

  return (
    <div ref={rootRef} className={`relative inline-flex items-center gap-1 ${className ?? ""}`}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={!hasBoundedRange}
        onClick={() => onChange(shiftRange(value, -1))}
        aria-label="Previous date range"
      >
        ←
      </button>

      <button type="button" className="btn btn-outline bg-base-100 btn-sm" onClick={openPicker}>
        <span className="truncate">{label}</span>
        <span aria-hidden="true">📅</span>
      </button>

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={!hasBoundedRange}
        onClick={() => onChange(shiftRange(value, 1))}
        aria-label="Next date range"
      >
        →
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-20 mt-2 w-[min(42rem,92vw)] rounded-xl border border-base-200 bg-base-100 p-3 shadow-lg">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
            <div className="space-y-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className="btn btn-ghost w-full justify-start btn-sm"
                  onClick={() => applyPreset(preset.key)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="form-control w-full">
                  <span className="label-text mb-1 text-sm font-medium">Start date</span>
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    value={draftStart}
                    onChange={(event) => setDraftStart(event.target.value)}
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text mb-1 text-sm font-medium">End date</span>
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    value={draftEnd}
                    onChange={(event) => setDraftEnd(event.target.value)}
                  />
                </label>
              </div>

              {invalidRange ? (
                <p className="text-xs text-error">Start date cannot be after end date.</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={invalidRange}
                  onClick={applyDraft}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
