"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import { toYmdUtc } from "@/src/utils/dateOnly";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { TotalBalanceCard } from "@/components/dashboard/widgets/TotalBalanceCard";
import { TotalChangeCard } from "@/components/dashboard/widgets/TotalChangeCard";
import { TotalIncomeCard } from "@/components/dashboard/widgets/TotalIncomeCard";
import { TotalExpensesCard } from "@/components/dashboard/widgets/TotalExpensesCard";
import { TopCategoriesWidget } from "@/components/dashboard/widgets/TopCategoriesWidget";
import { TopMerchantsWidget } from "@/components/dashboard/widgets/TopMerchantsWidget";
import { NextTwoWeeksRecurring } from "@/components/dashboard/widgets/NextTwoWeeksRecurring";

type Account = {
  _id: string;
  name: string;
  type?: string | null;
  currency?: string | null;
  isArchived?: boolean;
};

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  emoji?: string | null;
  isArchived?: boolean;
};

type SummaryResponse = {
  data: {
    totals: {
      incomeMinorByCurrency: Record<string, number>;
      expenseMinorByCurrency: Record<string, number>;
      balanceMinorByCurrency: Record<string, number>;
    };
    totalBalanceAsOfEnd: { byCurrency: Record<string, number> };
    totalChange: { byCurrency: Record<string, number> };
    topCategories: {
      income: Array<{
        categoryId: string | null;
        categoryName: string;
        emoji?: string | null;
        currency: string;
        amountMinor: number;
        count: number;
      }>;
      expense: Array<{
        categoryId: string | null;
        categoryName: string;
        emoji?: string | null;
        currency: string;
        amountMinor: number;
        count: number;
      }>;
    };
    topMerchants: {
      income: Array<{
        merchantId: string | null;
        merchantName: string;
        currency: string;
        amountMinor: number;
        count: number;
      }>;
      expense: Array<{
        merchantId: string | null;
        merchantName: string;
        currency: string;
        amountMinor: number;
        count: number;
      }>;
    };
    supportedCurrencies: string[];
  };
};

type NextTwoWeeksResponse = {
  data: {
    from: string;
    to: string;
    items: Array<{
      recurringId: string;
      title: string;
      nextDate: string;
      amountMinor: number;
      currency: string;
      kind: "income" | "expense";
      merchantName?: string | null;
      categoryName?: string | null;
      categoryEmoji?: string | null;
    }>;
  };
};

type ApiListResponse<T> = { data: T[] };

const buildDefaultRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    start: toYmdUtc(start),
    end: toYmdUtc(end),
  };
};

export function DashboardClient({ locale }: { locale: Locale }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([]);
  const [summary, setSummary] = useState<SummaryResponse["data"] | null>(null);
  const [recurring, setRecurring] = useState<NextTwoWeeksResponse["data"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState(buildDefaultRange);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");

  const loadFilters = useCallback(async () => {
    try {
      const [accountsResponse, categoriesResponse] = await Promise.all([
        getJSON<ApiListResponse<Account>>("/api/accounts?includeArchived=false"),
        getJSON<ApiListResponse<Category>>("/api/categories?includeArchived=false"),
      ]);
      setAccounts(accountsResponse.data);
      setCategories(categoriesResponse.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "dashboard_loading");
      setError(message);
    }
  }, [locale]);

  const loadSummary = useCallback(async () => {
    if (!dateRange.start || !dateRange.end) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("start", dateRange.start);
      params.set("end", dateRange.end);
      if (selectedAccounts.length > 0) {
        params.set("accountIds", selectedAccounts.join(","));
      }
      if (selectedCategories.length > 0) {
        params.set("categoryIds", selectedCategories.join(","));
      }
      if (selectedCurrency) {
        params.set("currency", selectedCurrency);
      }
      const response = await getJSON<SummaryResponse>(`/api/dashboard/summary?${params}`);
      setSummary(response.data);
      setSupportedCurrencies(response.data.supportedCurrencies);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "dashboard_loading");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [dateRange.end, dateRange.start, locale, selectedAccounts, selectedCategories, selectedCurrency]);

  const loadRecurring = useCallback(async () => {
    setError(null);
    setRecurringLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCurrency) {
        params.set("currency", selectedCurrency);
      }
      const response = await getJSON<NextTwoWeeksResponse>(
        `/api/dashboard/next-two-weeks?${params}`
      );
      setRecurring(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "dashboard_loading");
      setError(message);
    } finally {
      setRecurringLoading(false);
    }
  }, [locale, selectedCurrency]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadRecurring();
  }, [loadRecurring]);

  const hasSummary = Boolean(summary);

  const topCategories = useMemo(() => summary?.topCategories ?? { income: [], expense: [] }, [summary]);
  const topMerchants = useMemo(() => summary?.topMerchants ?? { income: [], expense: [] }, [summary]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral">{t(locale, "dashboard_title")}</h1>
        <p className="text-sm opacity-70">{t(locale, "dashboard_subtitle")}</p>
      </div>

      <DashboardFilters
        locale={locale}
        accounts={accounts}
        categories={categories}
        currencies={supportedCurrencies}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedAccounts={selectedAccounts}
        onAccountsChange={setSelectedAccounts}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
      />

      {error ? (
        <div className="alert alert-error flex items-center justify-between">
          <span>{error}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setError(null)}>
            {t(locale, "transactions_dismiss")}
          </button>
        </div>
      ) : null}

      {loading && !hasSummary ? (
        <p className="text-sm opacity-70">{t(locale, "dashboard_loading")}</p>
      ) : null}

      {summary ? (
        <DashboardGrid>
          <TotalBalanceCard
            locale={locale}
            totals={summary.totalBalanceAsOfEnd.byCurrency}
          />
          <TotalChangeCard locale={locale} totals={summary.totalChange.byCurrency} />
          <TotalIncomeCard locale={locale} totals={summary.totals.incomeMinorByCurrency} />
          <TotalExpensesCard locale={locale} totals={summary.totals.expenseMinorByCurrency} />
          <TopCategoriesWidget locale={locale} data={topCategories} />
          <TopMerchantsWidget locale={locale} data={topMerchants} />
          <NextTwoWeeksRecurring
            locale={locale}
            data={recurring}
            loading={recurringLoading}
          />
        </DashboardGrid>
      ) : null}
    </section>
  );
}
