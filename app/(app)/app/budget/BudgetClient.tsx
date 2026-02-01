"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { CurrencySection } from "@/components/budget/CurrencySection";
import { formatMonthLabel } from "@/src/utils/month";
import type { Locale } from "@/src/i18n/messages";

type SummaryRow = {
  categoryId: string | null;
  categoryName: string;
  plannedMinor: number;
  actualMinor: number;
  remainingMinor: number;
  progressPct: number;
  transactionCount: number;
};

type CurrencySectionData = {
  currency: string;
  rows: SummaryRow[];
  totals: { plannedMinor: number; actualMinor: number; remainingMinor: number };
};

type BudgetSummary = {
  month: string;
  currencies: CurrencySectionData[];
};

type ApiItemResponse<T> = { data: T };

const getCurrentMonth = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

export function BudgetClient({ locale }: { locale: Locale; defaultCurrency: string }) {
  const searchParams = useSearchParams();
  const initializedFromQuery = useRef(false);
  const [month, setMonth] = useState(getCurrentMonth());
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
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

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getJSON<ApiItemResponse<BudgetSummary>>(`/api/budget/summary?month=${month}`);
      setSummary(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budget_loading");
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [locale, month]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const sections = useMemo(() => summary?.currencies ?? [], [summary]);

  const labels = {
    category: t(locale, "budget_category"),
    planned: t(locale, "budget_planned"),
    actual: t(locale, "budget_spent"),
    remaining: t(locale, "budget_remaining"),
    progress: t(locale, "budget_progress"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t(locale, "budget_title")}</h1>
          <p className="text-sm opacity-70">{formatMonthLabel(month, locale)}</p>
        </div>
        <MonthPicker
          locale={locale}
          month={month}
          label={t(locale, "budget_month")}
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
        <p className="text-sm opacity-60">{t(locale, "budget_loading")}</p>
      ) : sections.length ? (
        <div className="space-y-6">
          {sections.map((section) => (
            <CurrencySection
              key={section.currency}
              currency={section.currency}
              rows={section.rows}
              totals={section.totals}
              locale={locale}
              labels={labels}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm opacity-60">{t(locale, "budget_empty")}</p>
      )}
    </div>
  );
}
