"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type TotalsByCurrency = {
  currency: string;
  spendMinor: number;
  incomeMinor: number;
  netMinor: number;
};

type SpendByCurrency = {
  currency: string;
  totalMinor: number;
};

type TopCategory = {
  categoryId: string;
  currency: string;
  totalMinor: number;
  nameKey?: string | null;
  nameCustom?: string | null;
};

type TopMerchant = {
  merchantId: string;
  currency: string;
  totalMinor: number;
  name: string;
};

type DashboardData = {
  month: string;
  totalsByCurrency: TotalsByCurrency[];
  spendByCurrency: SpendByCurrency[];
  topCategories: TopCategory[];
  topMerchants: TopMerchant[];
};

type ApiItemResponse<T> = { data: T };

const getCurrentMonth = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

export function DashboardClient({ locale }: { locale: Locale }) {
  const [month, setMonth] = useState(getCurrentMonth());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const formatCurrency = useCallback(
    (amountMinor: number, currency: string) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }).format(amountMinor / 100),
    [locale]
  );

  const categoryName = useCallback(
    (category?: TopCategory) =>
      category?.nameCustom?.trim() || category?.nameKey || t(locale, "category_fallback_name"),
    [locale]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getJSON<ApiItemResponse<DashboardData>>(`/api/dashboard?month=${month}`);
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

  const totals = useMemo(() => data?.totalsByCurrency ?? [], [data]);
  const spend = useMemo(() => data?.spendByCurrency ?? [], [data]);
  const topCategories = useMemo(() => data?.topCategories ?? [], [data]);
  const topMerchants = useMemo(() => data?.topMerchants ?? [], [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "dashboard_title")}</h1>
          <p className="mt-2 opacity-70">{t(locale, "dashboard_subtitle")}</p>
        </div>
        <label className="form-control">
          <span className="label-text text-xs">{t(locale, "dashboard_month")}</span>
          <input
            className="input input-bordered"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {totals.length ? (
              totals.map((total) => (
                <div key={total.currency} className="card bg-base-100 shadow">
                  <div className="card-body">
                    <p className="text-sm uppercase tracking-wide opacity-60">
                      {t(locale, "dashboard_total_spend")} ({total.currency})
                    </p>
                    <p className="text-2xl font-semibold">
                      {formatCurrency(total.spendMinor, total.currency)}
                    </p>
                    <div className="mt-2 space-y-1 text-sm opacity-70">
                      <p>
                        {t(locale, "dashboard_income")}:{" "}
                        {formatCurrency(total.incomeMinor, total.currency)}
                      </p>
                      <p>
                        {t(locale, "dashboard_net")}:{" "}
                        {formatCurrency(total.netMinor, total.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <p className="opacity-70">{t(locale, "dashboard_no_activity")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="text-lg font-semibold">{t(locale, "dashboard_top_categories")}</h2>
                {topCategories.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {topCategories.map((category) => (
                      <li key={`${category.categoryId}-${category.currency}`} className="flex justify-between">
                        <span>{categoryName(category)}</span>
                        <span className="font-medium">
                          {formatCurrency(category.totalMinor, category.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm opacity-60">{t(locale, "dashboard_no_categories")}</p>
                )}
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="text-lg font-semibold">{t(locale, "dashboard_top_merchants")}</h2>
                {topMerchants.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {topMerchants.map((merchant) => (
                      <li key={`${merchant.merchantId}-${merchant.currency}`} className="flex justify-between">
                        <span>{merchant.name}</span>
                        <span className="font-medium">
                          {formatCurrency(merchant.totalMinor, merchant.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm opacity-60">{t(locale, "dashboard_no_merchants")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="text-lg font-semibold">{t(locale, "dashboard_spend_by_currency")}</h2>
              {spend.length ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {spend.map((row) => (
                    <div key={row.currency} className="rounded-box border border-base-200 p-3">
                      <p className="text-xs uppercase opacity-60">{row.currency}</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(row.totalMinor, row.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm opacity-60">{t(locale, "dashboard_no_spend")}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
