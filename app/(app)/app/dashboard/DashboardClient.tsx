"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getJSON } from "@/src/lib/apiClient";
import { formatCurrency } from "@/src/lib/format";
import { formatMonthLabel } from "@/src/utils/month";
import { t } from "@/src/i18n/t";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { TopList } from "@/components/dashboard/TopList";
import type { Locale } from "@/src/i18n/messages";

type TotalsByCurrency = {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  transactionCount: number;
};

type TopMerchant = {
  merchantId: string | null;
  merchantName: string;
  currency: string;
  expenseMinor: number;
  count: number;
};

type TopCategory = {
  categoryId: string | null;
  categoryName: string;
  currency: string;
  expenseMinor: number;
  count: number;
};

type DashboardData = {
  month: string;
  totalsByCurrency: TotalsByCurrency[];
  topMerchants: TopMerchant[];
  topCategories: TopCategory[];
};

type ApiItemResponse<T> = { data: T };

const getCurrentMonth = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

export function DashboardClient({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const initializedFromQuery = useRef(false);
  const [month, setMonth] = useState(getCurrentMonth());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (initializedFromQuery.current) return;
    const monthParam = searchParams.get("month");
    if (monthParam) {
      setMonth(monthParam);
    }
    initializedFromQuery.current = true;
  }, [searchParams]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getJSON<ApiItemResponse<DashboardData>>(
        `/api/dashboard?month=${month}`
      );
      setData(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "dashboard_loading");
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [locale, month]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const topMerchants = useMemo(() => data?.topMerchants ?? [], [data]);
  const topCategories = useMemo(() => data?.topCategories ?? [], [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "dashboard_title")}</h1>
          <p className="mt-2 opacity-70">{t(locale, "dashboard_subtitle")}</p>
        </div>
        <MonthPicker
          locale={locale}
          month={month}
          label={t(locale, "dashboard_month")}
          helperText={formatMonthLabel(month, locale)}
          onChange={setMonth}
        />
      </div>

      {toast ? (
        <div className="alert alert-error">
          <span>{toast}</span>
          <button className="btn btn-sm" onClick={() => setToast(null)}>
            {t(locale, "transactions_dismiss")}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm opacity-60">{t(locale, "dashboard_loading")}</p>
      ) : (
        <>
          <StatsCards totalsByCurrency={data?.totalsByCurrency ?? []} locale={locale} />

          <div className="grid gap-4 lg:grid-cols-2">
            <TopList
              title={t(locale, "dashboard_top_merchants")}
              emptyLabel={t(locale, "dashboard_no_merchants")}
              countLabel={t(locale, "dashboard_transactions")}
              items={topMerchants.map((merchant) => ({
                id: `${merchant.merchantId ?? "unassigned"}-${merchant.currency}`,
                label: merchant.merchantName,
                value: formatCurrency(merchant.expenseMinor, merchant.currency, locale),
                count: merchant.count,
              }))}
            />
            <TopList
              title={t(locale, "dashboard_top_categories")}
              emptyLabel={t(locale, "dashboard_no_categories")}
              countLabel={t(locale, "dashboard_transactions")}
              items={topCategories.map((category) => ({
                id: `${category.categoryId ?? "uncategorized"}-${category.currency}`,
                label: category.categoryName,
                value: formatCurrency(category.expenseMinor, category.currency, locale),
                count: category.count,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
