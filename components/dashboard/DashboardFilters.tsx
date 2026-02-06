"use client";

import type { ChangeEvent } from "react";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type Account = {
  _id: string;
  name: string;
  isArchived?: boolean;
};

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  emoji?: string | null;
  isArchived?: boolean;
};

type DateRange = {
  start: string;
  end: string;
};

type DashboardFiltersProps = {
  locale: Locale;
  accounts: Account[];
  categories: Category[];
  currencies: string[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedAccounts: string[];
  onAccountsChange: (values: string[]) => void;
  selectedCategories: string[];
  onCategoriesChange: (values: string[]) => void;
  selectedCurrency: string;
  onCurrencyChange: (value: string) => void;
};

export function DashboardFilters({
  locale,
  accounts,
  categories,
  currencies,
  dateRange,
  onDateRangeChange,
  selectedAccounts,
  onAccountsChange,
  selectedCategories,
  onCategoriesChange,
  selectedCurrency,
  onCurrencyChange,
}: DashboardFiltersProps) {
  const handleMultiSelect = (
    event: ChangeEvent<HTMLSelectElement>,
    setter: (values: string[]) => void
  ) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    setter(values);
  };

  const categoryLabel = (category: Category) => {
    const name = category.nameCustom ?? category.nameKey ?? t(locale, "category_fallback_name");
    return category.emoji ? `${category.emoji} ${name}` : name;
  };

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body space-y-4">
        <h2 className="text-lg font-semibold">{t(locale, "dashboard_filters_title")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "dashboard_filters_start")}
            </span>
            <input
              type="date"
              className="input input-bordered w-full"
              value={dateRange.start}
              onChange={(event) =>
                onDateRangeChange({
                  ...dateRange,
                  start: event.target.value,
                })
              }
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "dashboard_filters_end")}
            </span>
            <input
              type="date"
              className="input input-bordered w-full"
              value={dateRange.end}
              onChange={(event) =>
                onDateRangeChange({
                  ...dateRange,
                  end: event.target.value,
                })
              }
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "dashboard_filters_accounts")}
            </span>
            <select
              className="select select-bordered h-32"
              multiple
              value={selectedAccounts}
              onChange={(event) => handleMultiSelect(event, onAccountsChange)}
            >
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "dashboard_filters_categories")}
            </span>
            <select
              className="select select-bordered h-32"
              multiple
              value={selectedCategories}
              onChange={(event) => handleMultiSelect(event, onCategoriesChange)}
            >
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "dashboard_filters_currency")}
            </span>
            <select
              className="select select-bordered"
              value={selectedCurrency}
              onChange={(event) => onCurrencyChange(event.target.value)}
            >
              <option value="">{t(locale, "dashboard_filters_all_currencies")}</option>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs opacity-60">{t(locale, "dashboard_filters_multiselect_hint")}</p>
      </div>
    </div>
  );
}
