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
  showKind?: boolean;
  kindValue?: string[];
  kindOptions?: Option[];
  onKindChange?: (nextIds: string[]) => void;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (nextValue: string) => void;
  searchPlaceholder?: string;
  categoryGroups?: Option[];
  categoryGroupIdByOption?: Record<string, string | null | undefined>;
};

function FilterField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="text-[11px] font-semibold tracking-wide opacity-70">{label}</div>
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
  showKind = false,
  kindValue = [],
  kindOptions = [],
  onKindChange,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search transactions",
  categoryGroups = [],
  categoryGroupIdByOption,
}: AppFiltersBarProps) {
  const boxGridColumnsClass = showKind || showSearch ? "lg:grid-cols-3" : "lg:grid-cols-4";

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <FilterField label="Date Range" className="w-full max-w-[320px]">
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
                  <div className="mb-2 text-xs font-semibold opacity-70">Custom Range</div>
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
      </div>

      <div className="rounded-xl border border-base-200 bg-white p-4 shadow-sm">
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${boxGridColumnsClass}`}>
          <FilterField label="Accounts" className="w-full">
            <MultiSelectDropDown
              options={accounts.map((option) => ({ id: option.id, label: option.label }))}
              selectedIds={value.accountIds}
              onChange={(ids) => onChange({ ...value, accountIds: ids })}
              placeholder="All accounts"
            />
          </FilterField>

          <FilterField label="Categories" className="w-full">
            <MultiSelectDropDown
              options={categories.map((option) => ({
                id: option.id,
                label: `${option.emoji ? `${option.emoji} ` : ""}${option.label}`,
              }))}
              selectedIds={value.categoryIds}
              onChange={(ids) => onChange({ ...value, categoryIds: ids })}
              placeholder="All categories"
              grouped
              groups={categoryGroups}
              groupIdByOption={categoryGroupIdByOption}
            />
          </FilterField>

          <FilterField label="Merchants" className="w-full">
            <MultiSelectDropDown
              options={merchants.map((option) => ({ id: option.id, label: option.label }))}
              selectedIds={value.merchantIds}
              onChange={(ids) => onChange({ ...value, merchantIds: ids })}
              placeholder="All merchants"
            />
          </FilterField>

          <FilterField label="Tags" className="w-full">
            <MultiSelectDropDown
              options={tags.map((option) => ({ id: option.id, label: option.label }))}
              selectedIds={value.tagIds}
              onChange={(ids) => onChange({ ...value, tagIds: ids })}
              placeholder="All tags"
            />
          </FilterField>

          {showGroups && groups?.length ? (
            <FilterField label="Groups" className="w-full">
              <MultiSelectDropDown
                options={groups.map((option) => ({ id: option.id, label: option.label }))}
                selectedIds={value.groupIds ?? []}
                onChange={(ids) => onChange({ ...value, groupIds: ids })}
                placeholder="All groups"
              />
            </FilterField>
          ) : null}

          {showKind ? (
            <FilterField label="Kind" className="w-full">
              <MultiSelectDropDown
                options={kindOptions.map((option) => ({ id: option.id, label: option.label }))}
                selectedIds={kindValue}
                onChange={(ids) => onKindChange?.(ids)}
                placeholder="Any kind"
              />
            </FilterField>
          ) : null}

          {showSearch ? (
            <FilterField label="Search" className="w-full">
              <input
                type="text"
                className="input input-bordered bg-white w-full"
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </FilterField>
          ) : null}
        </div>
      </div>
    </div>
  );
}
