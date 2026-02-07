"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/budget/ProgressBar";
import { CreateBudgetWizardModal, type Budget } from "@/components/budgets/CreateBudgetWizardModal";
import { SurfaceCard, SurfaceCardBody } from "@/components/ui/SurfaceCard";
import { formatCurrency } from "@/src/lib/format";
import { getJSON, putJSON } from "@/src/lib/apiClient";
import { formatDateOnly } from "@/src/utils/dateOnly";
import { formatMonthLabel } from "@/src/utils/month";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type Transaction = {
  _id: string;
  date: string;
  amountMinor: number;
  currency: string;
  kind: "income" | "expense";
  categoryId: string | null;
  merchantNameSnapshot?: string | null;
  note?: string;
  isArchived?: boolean;
};

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
};

type Account = {
  _id: string;
  name: string;
  isArchived?: boolean;
};

type ApiItemResponse<T> = { data: T };
type ApiListResponse<T> = { data: T[] };

export function BudgetDetailClient({
  locale,
  defaultCurrency,
  budgetId,
}: {
  locale: Locale;
  defaultCurrency: string;
  budgetId: string;
}) {
  const router = useRouter();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadBudget = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getJSON<ApiItemResponse<Budget>>(`/api/budgets/${budgetId}`);
      setBudget(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budgets_generic_error");
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [budgetId, locale]);

  const loadTransactions = useCallback(async () => {
    try {
      const response = await getJSON<ApiItemResponse<{ items: Transaction[] }>>(
        `/api/transactions?budgetId=${budgetId}&includeArchived=true`
      );
      setTransactions(response.data.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budgets_generic_error");
      setToast(message);
    }
  }, [budgetId, locale]);

  const loadMeta = useCallback(async () => {
    try {
      const [categoriesResponse, accountsResponse] = await Promise.all([
        getJSON<ApiListResponse<Category>>("/api/categories?includeArchived=true"),
        getJSON<ApiListResponse<Account>>("/api/accounts?includeArchived=true"),
      ]);
      setCategories(categoriesResponse.data);
      setAccounts(accountsResponse.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budgets_generic_error");
      setToast(message);
    }
  }, [locale]);

  useEffect(() => {
    void loadBudget();
    void loadTransactions();
    void loadMeta();
  }, [loadBudget, loadMeta, loadTransactions]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(category._id, category.nameCustom?.trim() || category.nameKey || "Category");
    });
    return map;
  }, [categories]);

  const visibleTransactions = useMemo(
    () => transactions.filter((transaction) => (showArchived ? true : !transaction.isArchived)),
    [showArchived, transactions]
  );

  const dateRange = useMemo(() => {
    if (!budget) return null;
    const start = new Date(budget.startDate);
    const end = new Date(budget.endDate);
    return { start, end };
  }, [budget]);

  const isInRange = (transaction: Transaction) => {
    if (!dateRange) return true;
    const date = new Date(transaction.date);
    return date >= dateRange.start && date <= dateRange.end;
  };

  const spendMinor = useMemo(() => {
    if (!budget) return 0;
    return transactions
      .filter((transaction) => transaction.kind === "expense")
      .filter((transaction) => isInRange(transaction))
      .reduce((sum, transaction) => sum + transaction.amountMinor, 0);
  }, [budget, transactions]);

  const limitMinor =
    budget?.limitAmount !== null && budget?.limitAmount !== undefined
      ? Math.round(budget.limitAmount * 100)
      : null;

  const remainingMinor = limitMinor !== null ? limitMinor - spendMinor : null;
  const progress = limitMinor ? Math.min(spendMinor / limitMinor, 1) : 0;

  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    transactions
      .filter((transaction) => transaction.kind === "expense")
      .filter((transaction) => isInRange(transaction))
      .forEach((transaction) => {
        const key = transaction.categoryId ?? "uncategorized";
        breakdown.set(key, (breakdown.get(key) ?? 0) + transaction.amountMinor);
      });
    return Array.from(breakdown.entries())
      .map(([key, amount]) => ({
        key,
        label:
          key === "uncategorized"
            ? t(locale, "transactions_category_uncategorized")
            : categoryMap.get(key) ?? t(locale, "category_fallback_name"),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categoryMap, locale, transactions]);

  const formatBudgetDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return formatDateOnly(date.toISOString().slice(0, 10), locale);
  };

  const periodLabel =
    budget?.type === "monthly" && budget.month
      ? formatMonthLabel(budget.month, locale)
      : budget
        ? `${formatBudgetDate(budget.startDate)} → ${formatBudgetDate(budget.endDate)}`
        : "";

  const formatTransactionDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return formatDateOnly(date.toISOString().slice(0, 10), locale);
  };

  const handleArchiveToggle = async () => {
    if (!budget) return;
    setSubmitting(true);
    try {
      const payload = { archivedAt: budget.archivedAt ? null : new Date().toISOString() };
      const response = await putJSON<ApiItemResponse<Budget>>(`/api/budgets/${budget._id}`, payload);
      setBudget(response.data);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budgets_generic_error");
      setToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !budget) {
    return <p className="text-sm opacity-60">{t(locale, "budgets_loading")}</p>;
  }

  if (!budget) {
    return (
      <div className="space-y-4">
        <p className="text-sm opacity-60">{t(locale, "budgets_not_found")}</p>
        <Link className="link link-primary" href="/app/budgets">
          {t(locale, "budgets_back_to_list")}
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link className="link link-primary text-sm" href="/app/budgets">
            {t(locale, "budgets_back_to_list")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-neutral">
            {budget.emoji ? `${budget.emoji} ` : ""}
            {budget.name}
          </h1>
          <p className="mt-1 opacity-70">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="opacity-70">{t(locale, "budgets_show_archived")}</span>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
          </label>
          <button className="btn btn-ghost btn-sm" onClick={() => setWizardOpen(true)}>
            {t(locale, "budgets_edit")}
          </button>
          <button
            className="btn btn-ghost btn-sm text-error"
            onClick={handleArchiveToggle}
            disabled={submitting}
          >
            {budget.archivedAt ? t(locale, "budgets_unarchive") : t(locale, "budgets_archive")}
          </button>
        </div>
      </div>

      {toast ? (
        <div className="alert alert-error flex items-center justify-between">
          <span>{toast}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setToast(null)}>
            {t(locale, "transactions_dismiss")}
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard>
          <SurfaceCardBody className="space-y-2">
            <p className="text-sm font-semibold">{t(locale, "budgets_overview_spent")}</p>
            <p className="text-2xl font-bold">
              {formatCurrency(spendMinor, defaultCurrency, locale)}
            </p>
            {limitMinor !== null ? (
              <p className="text-xs opacity-60">
                {formatCurrency(remainingMinor ?? 0, defaultCurrency, locale)}{" "}
                {t(locale, "budgets_remaining_label")}
              </p>
            ) : (
              <p className="text-xs opacity-60">{t(locale, "budgets_track_only")}</p>
            )}
            {limitMinor !== null ? <ProgressBar value={progress} /> : null}
          </SurfaceCardBody>
        </SurfaceCard>
        <SurfaceCard>
          <SurfaceCardBody className="space-y-2">
            <p className="text-sm font-semibold">{t(locale, "budgets_overview_scope")}</p>
            <p className="text-sm opacity-70">
              {budget.categoryIds === null
                ? t(locale, "budgets_scope_all_categories")
                : `${budget.categoryIds.length} ${t(locale, "budgets_scope_categories_selected")}`}
            </p>
            <p className="text-sm opacity-70">
              {budget.accountIds === null
                ? t(locale, "budgets_scope_all_accounts")
                : `${budget.accountIds.length} ${t(locale, "budgets_scope_accounts_selected")}`}
            </p>
          </SurfaceCardBody>
        </SurfaceCard>
        <SurfaceCard>
          <SurfaceCardBody className="space-y-2">
            <p className="text-sm font-semibold">{t(locale, "budgets_overview_alerts")}</p>
            <p className="text-sm opacity-70">
              {budget.alerts?.enabled
                ? budget.alerts.thresholds.join("%, ") + "%"
                : t(locale, "budgets_alerts_disabled")}
            </p>
            <p className="text-sm opacity-70">{t(locale, "budgets_overview_currency")}</p>
            <p className="text-sm font-semibold">{defaultCurrency}</p>
          </SurfaceCardBody>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SurfaceCardBody className="space-y-3">
          <h2 className="text-lg font-semibold">{t(locale, "budgets_breakdown_title")}</h2>
          {categoryBreakdown.length ? (
            <div className="space-y-2">
              {categoryBreakdown.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-semibold">
                    {formatCurrency(item.amount, defaultCurrency, locale)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-60">{t(locale, "budgets_breakdown_empty")}</p>
          )}
        </SurfaceCardBody>
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceCardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t(locale, "budgets_recent_transactions")}</h2>
            <span className="text-xs opacity-60">
              {visibleTransactions.length} {t(locale, "budgets_transactions_count")}
            </span>
          </div>
          {visibleTransactions.length ? (
            <div className="space-y-3">
              {visibleTransactions.map((transaction) => {
                const outsideRange = !isInRange(transaction);
                return (
                  <div
                    key={transaction._id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 pb-3 text-sm last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-semibold">
                        {transaction.merchantNameSnapshot || transaction.note || "—"}
                      </p>
                      <p className="text-xs opacity-60">
                        {formatTransactionDate(transaction.date)} ·{" "}
                        {transaction.categoryId
                          ? categoryMap.get(transaction.categoryId) ??
                            t(locale, "category_fallback_name")
                          : t(locale, "transactions_category_uncategorized")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {outsideRange ? (
                        <span className="badge badge-outline text-xs">
                          {t(locale, "budgets_outside_period")}
                        </span>
                      ) : null}
                      <span className="font-semibold">
                        {formatCurrency(
                          transaction.amountMinor,
                          transaction.currency || defaultCurrency,
                          locale
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm opacity-60">{t(locale, "budgets_transactions_empty")}</p>
          )}
        </SurfaceCardBody>
      </SurfaceCard>

      <CreateBudgetWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={(updatedBudget) => {
          setBudget(updatedBudget);
          void loadBudget();
        }}
        locale={locale}
        defaultCurrency={defaultCurrency}
        categories={categories}
        accounts={accounts}
        initialBudget={budget}
      />
    </section>
  );
}
