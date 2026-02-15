"use client";

import React from "react";
import { MultiSelectDropDown } from "@/components/shared/MultiSelectDropDown";
import type {
  AppFiltersValue,
  DateRangePreset,
  DateRangeValue,
} from "@/src/types/filters";

type Option = { id: string; label: string; emoji?: string | null };

type AppFiltersBarProps = {
  value: AppFiltersValue;
  onChange: (next: AppFiltersValue) => void;
  accounts: Option[];
  categories: Option[];
  merchants: Option[];
  tags: Option[];
  groups?: Option[];
  showGroups?: boolean;
};

function FilterField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="text-xs font-semibold opacity-70">{label}</div>
      {children}
    </div>
  );
}

const presetLabels: Record<DateRangePreset, string> = {
  thisWeek: "This Week",
  lastWeek: "Last Week",
  thisMonth: "This Month",
  lastMonth: "Last Month",
  thisYear: "This Year",
  lastYear: "Last Year",
  allHistory: "All History",
  custom: "Custom",
};

function dateRangeLabel(value: DateRangeValue) {
  if (value.preset !== "custom") return presetLabels[value.preset];
  if (value.start && value.end) return `${value.start} → ${value.end}`;
  return "Custom";
}

export function AppFiltersBar({
  value,
  onChange,
  accounts,
  categories,
  merchants,
  tags,
  groups,
  showGroups = false,
}: AppFiltersBarProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border border-base-200">
      <div className="flex flex-wrap items-end gap-3">
        <FilterField label="Date Range" className="min-w-[240px]">
          <MultiSelectDropDown
            mode="custom"
            buttonLabel={dateRangeLabel(value.dateRange)}
            onClear={() => onChange({ ...value, dateRange: { preset: "thisMonth" } })}
            customPanel={
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    "thisWeek",
                    "lastWeek",
                    "thisMonth",
                    "lastMonth",
                    "thisYear",
                    "lastYear",
                    "allHistory",
                  ] as DateRangePreset[]).map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      className={`btn btn-sm ${value.dateRange.preset === preset ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => onChange({ ...value, dateRange: { preset } })}
                    >
                      {presetLabels[preset]}
                    </button>
                  ))}
                </div>

                <div className="border-t border-base-200 pt-3">
                  <div className="text-xs font-semibold opacity-70 mb-2">Custom Range</div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="input input-bordered bg-white input-sm w-full"
                      value={value.dateRange.preset === "custom" ? (value.dateRange.start ?? "") : ""}
                      onChange={(event) =>
                        onChange({
                          ...value,
                          dateRange: {
                            preset: "custom",
                            start: event.target.value,
                            end: value.dateRange.preset === "custom" ? value.dateRange.end : "",
                          },
                        })
                      }
                    />
                    <input
                      type="date"
                      className="input input-bordered bg-white input-sm w-full"
                      value={value.dateRange.preset === "custom" ? (value.dateRange.end ?? "") : ""}
                      onChange={(event) =>
                        onChange({
                          ...value,
                          dateRange: {
                            preset: "custom",
                            start: value.dateRange.preset === "custom" ? value.dateRange.start : "",
                            end: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            }
          />
        </FilterField>

        <FilterField label="Accounts" className="min-w-[220px]">
          <MultiSelectDropDown
            options={accounts.map((option) => ({ id: option.id, label: option.label }))}
            selectedIds={value.accountIds}
            onChange={(ids) => onChange({ ...value, accountIds: ids })}
            placeholder="All accounts"
          />
        </FilterField>

        <FilterField label="Categories" className="min-w-[220px]">
          <MultiSelectDropDown
            options={categories.map((option) => ({
              id: option.id,
              label: `${option.emoji ? `${option.emoji} ` : ""}${option.label}`,
            }))}
            selectedIds={value.categoryIds}
            onChange={(ids) => onChange({ ...value, categoryIds: ids })}
            placeholder="All categories"
          />
        </FilterField>

        <FilterField label="Merchants" className="min-w-[220px]">
          <MultiSelectDropDown
            options={merchants.map((option) => ({ id: option.id, label: option.label }))}
            selectedIds={value.merchantIds}
            onChange={(ids) => onChange({ ...value, merchantIds: ids })}
            placeholder="All merchants"
          />
        </FilterField>

        <FilterField label="Tags" className="min-w-[220px]">
          <MultiSelectDropDown
            options={tags.map((option) => ({ id: option.id, label: option.label }))}
            selectedIds={value.tagIds}
            onChange={(ids) => onChange({ ...value, tagIds: ids })}
            placeholder="All tags"
          />
        </FilterField>

        {showGroups && groups?.length ? (
          <FilterField label="Groups" className="min-w-[220px]">
            <MultiSelectDropDown
              options={groups.map((option) => ({ id: option.id, label: option.label }))}
              selectedIds={value.groupIds ?? []}
              onChange={(ids) => onChange({ ...value, groupIds: ids })}
              placeholder="All groups"
            />
          </FilterField>
        ) : null}
      </div>
    </div>
  );
}

