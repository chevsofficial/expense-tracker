"use client";

import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import { SurfaceCard, SurfaceCardBody } from "@/components/ui/SurfaceCard";
import type { Category } from "@/src/types/category";

type Account = {
  _id: string;
  name: string;
  isArchived?: boolean;
};

type Merchant = {
  _id: string;
  name: string;
  isArchived?: boolean;
};

type DateRange = {
  start: string;
  end: string;
};

export type DashboardFilters = {
  dateRange: DateRange;
  accountId?: string;
  categoryId?: string;
  merchantId?: string;
  currency?: string;
};

type DashboardFilterBarProps = {
  locale: Locale;
  accounts: Account[];
  categories: Category[];
  merchants: Merchant[];
  currencies: string[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedAccountId: string;
  onAccountChange: (value: string) => void;
  selectedCategoryId: string;
  onCategoryChange: (value: string) => void;
  selectedMerchantId: string;
  onMerchantChange: (value: string) => void;
  selectedCurrency: string;
  onCurrencyChange: (value: string) => void;
};

export function DashboardFilterBar({
  locale,
  accounts,
  categories,
  merchants,
  currencies,
  dateRange,
  onDateRangeChange,
  selectedAccountId,
  onAccountChange,
  selectedCategoryId,
  onCategoryChange,
  selectedMerchantId,
  onMerchantChange,
  selectedCurrency,
  onCurrencyChange,
}: DashboardFilterBarProps) {
  const categoryLabel = (category: Category) => {
    const name = category.nameCustom ?? category.nameKey ?? t(locale, "category_fallback_name");
    return category.emoji ? `${category.emoji} ${name}` : name;
  };

  return (
    <SurfaceCard>
      <SurfaceCardBody className="space-y-3">
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="form-control w-full sm:w-auto">
          <span className="label-text mb-1 text-sm font-medium">
            {t(locale, "dashboard_filters_start")}
          </span>
          <input
            type="date"
            className="input input-bordered w-full sm:w-44"
            value={dateRange.start}
            onChange={(event) =>
              onDateRangeChange({
                ...dateRange,
                start: event.target.value,
              })
            }
          />
        </label>
        <label className="form-control w-full sm:w-auto">
          <span className="label-text mb-1 text-sm font-medium">
            {t(locale, "dashboard_filters_end")}
          </span>
          <input
            type="date"
            className="input input-bordered w-full sm:w-44"
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

      <div className="flex flex-wrap gap-2">
        <label className="form-control w-full sm:w-auto">
          <span className="label-text mb-1 text-sm font-medium">
            {t(locale, "dashboard_filters_accounts")}
          </span>
          <select
            className="select select-bordered w-full sm:w-auto"
            value={selectedAccountId}
            onChange={(event) => onAccountChange(event.target.value)}
          >
            <option value="">{t(locale, "dashboard_filters_all_accounts")}</option>
            {accounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control w-full sm:w-auto">
          <span className="label-text mb-1 text-sm font-medium">
            {t(locale, "dashboard_filters_categories")}
          </span>
          <select
            className="select select-bordered w-full sm:w-auto"
            value={selectedCategoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            <option value="">{t(locale, "dashboard_filters_all_categories")}</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control w-full sm:w-auto">
          <span className="label-text mb-1 text-sm font-medium">
            {t(locale, "dashboard_filters_merchants")}
          </span>
          <select
            className="select select-bordered w-full sm:w-auto"
            value={selectedMerchantId}
            onChange={(event) => onMerchantChange(event.target.value)}
          >
            <option value="">{t(locale, "dashboard_filters_all_merchants")}</option>
            {merchants.map((merchant) => (
              <option key={merchant._id} value={merchant._id}>
                {merchant.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control w-full sm:w-auto">
          <span className="label-text mb-1 text-sm font-medium">
            {t(locale, "dashboard_filters_currency")}
          </span>
          <select
            className="select select-bordered w-full sm:w-auto"
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
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
