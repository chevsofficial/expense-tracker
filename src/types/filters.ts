export type DateRangePreset =
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "allHistory"
  | "custom";

export type DateRangeValue = {
  preset: DateRangePreset;
  start?: string;
  end?: string;
};

export type AppFiltersValue = {
  dateRange: DateRangeValue;
  accountIds: string[];
  categoryIds: string[];
  merchantIds: string[];
  tagIds: string[];
  groupIds?: string[];
};
