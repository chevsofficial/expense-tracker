"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getJSON, postJSON, putJSON, delJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  isArchived?: boolean;
};

type PlannedLine = {
  categoryId: string;
  plannedAmountMinor: number;
};

type BudgetMonth = {
  _id: string;
  month: string;
  currency: string;
  plannedLines: PlannedLine[];
};

type SummaryLine = {
  categoryId: string;
  plannedMinor: number;
  spentMinor: number;
  remainingMinor: number;
};

type BudgetSummary = {
  month: string;
  currency: string;
  totalPlannedMinor: number;
  totalSpentMinor: number;
  remainingMinor: number;
  byCategory: SummaryLine[];
};

type ApiItemResponse<T> = { data: T };
type ApiListResponse<T> = { data: T[] };

const getCurrentMonth = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

const getPreviousMonth = (value: string) => {
  const [yearRaw, monthRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month) return value;
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  const prevMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${prevMonth}`;
};

export function BudgetClient({ locale, defaultCurrency }: { locale: Locale; defaultCurrency: string }) {
  const [month, setMonth] = useState(getCurrentMonth());
  const [categories, setCategories] = useState<Category[]>([]);
  const [budget, setBudget] = useState<BudgetMonth | null>(null);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [plannedInputs, setPlannedInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const categoryName = useCallback(
    (category?: Category | null) =>
      category?.nameCustom?.trim() || category?.nameKey || t(locale, "category_fallback_name"),
    [locale]
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((category) => map.set(category._id, category));
    return map;
  }, [categories]);

  const summaryMap = useMemo(() => {
    const map = new Map<string, SummaryLine>();
    summary?.byCategory.forEach((line) => map.set(line.categoryId, line));
    return map;
  }, [summary]);

  const formatCurrency = useCallback(
    (amountMinor: number, currency?: string) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || defaultCurrency,
      }).format(amountMinor / 100),
    [defaultCurrency, locale]
  );

  const loadBudget = useCallback(async () => {
    setLoading(true);
    try {
      const [categoriesResponse, budgetResponse, summaryResponse] = await Promise.all([
        getJSON<ApiListResponse<Category>>("/api/categories?includeArchived=false"),
        getJSON<ApiItemResponse<BudgetMonth>>(`/api/budget?month=${month}`),
        getJSON<ApiItemResponse<BudgetSummary>>(`/api/budget/summary?month=${month}`),
      ]);
      setCategories(categoriesResponse.data);
      setBudget(budgetResponse.data);
      setSummary(summaryResponse.data);

      const inputs: Record<string, string> = {};
      budgetResponse.data.plannedLines.forEach((line) => {
        inputs[line.categoryId] = (line.plannedAmountMinor / 100).toFixed(2);
      });
      categoriesResponse.data.forEach((category) => {
        if (!(category._id in inputs)) inputs[category._id] = "";
      });
      setPlannedInputs(inputs);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budget_loading");
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [locale, month]);

  useEffect(() => {
    void loadBudget();
  }, [loadBudget]);

  const handleSave = async (categoryId: string) => {
    const raw = plannedInputs[categoryId] ?? "";
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setToast(t(locale, "transactions_amount_invalid"));
      return;
    }
    try {
      const response = await putJSON<ApiItemResponse<BudgetMonth>>(
        `/api/budget?month=${month}`,
        {
          plannedLines: [{ categoryId, plannedAmount: parsed }],
          currency: budget?.currency,
        }
      );
      setBudget(response.data);
      const summaryResponse = await getJSON<ApiItemResponse<BudgetSummary>>(
        `/api/budget/summary?month=${month}`
      );
      setSummary(summaryResponse.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budget_loading");
      setToast(message);
    }
  };

  const handleCopyLastMonth = async () => {
    try {
      const prev = getPreviousMonth(month);
      await postJSON<ApiItemResponse<BudgetMonth>>(
        `/api/budget/copy?from=${prev}&to=${month}`,
        {}
      );
      await loadBudget();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budget_loading");
      setToast(message);
    }
  };

  const handleReset = async () => {
    try {
      await delJSON<ApiItemResponse<BudgetMonth>>(`/api/budget?month=${month}`);
      await loadBudget();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budget_loading");
      setToast(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t(locale, "budget_title")}</h1>
          <p className="text-sm opacity-70">
            {summary
              ? `${formatCurrency(summary.totalPlannedMinor, summary.currency)} • ${formatCurrency(
                  summary.totalSpentMinor,
                  summary.currency
                )}`
              : t(locale, "budget_loading")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="form-control">
            <span className="label-text text-xs">{t(locale, "budget_month")}</span>
            <input
              className="input input-bordered"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
          <button className="btn btn-outline" type="button" onClick={handleCopyLastMonth}>
            {t(locale, "budget_copy_last_month")}
          </button>
          <button className="btn btn-ghost" type="button" onClick={handleReset}>
            {t(locale, "budget_reset_month")}
          </button>
        </div>
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
      ) : categories.length ? (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table">
            <thead>
              <tr>
                <th>{t(locale, "budget_category")}</th>
                <th>{t(locale, "budget_planned")}</th>
                <th>{t(locale, "budget_spent")}</th>
                <th>{t(locale, "budget_remaining")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const summaryLine = summaryMap.get(category._id);
                return (
                  <tr key={category._id}>
                    <td>{categoryName(category)}</td>
                    <td>
                      <input
                        className="input input-bordered input-sm w-32"
                        value={plannedInputs[category._id] ?? ""}
                        onChange={(event) =>
                          setPlannedInputs((current) => ({
                            ...current,
                            [category._id]: event.target.value,
                          }))
                        }
                        placeholder="0.00"
                      />
                    </td>
                    <td>
                      {summaryLine
                        ? formatCurrency(summaryLine.spentMinor, summary?.currency)
                        : formatCurrency(0, summary?.currency)}
                    </td>
                    <td>
                      {summaryLine
                        ? formatCurrency(summaryLine.remainingMinor, summary?.currency)
                        : formatCurrency(0, summary?.currency)}
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        type="button"
                        onClick={() => handleSave(category._id)}
                      >
                        {t(locale, "budget_save")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm opacity-60">{t(locale, "budget_empty")}</p>
      )}
    </div>
  );
}
