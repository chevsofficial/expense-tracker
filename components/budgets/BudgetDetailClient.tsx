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
import { formatMonthLabel, monthRange } from "@/src/utils/month";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import type { Category } from "@/src/types/category";

type Transaction = {
  _id: string;
  date: string;
  amountMinor: number;
  kind: "income" | "expense";
  categoryId: string | null;
  merchantNameSnapshot?: string | null;
  note?: string;
  isArchived?: boolean;
};

type Account = {
  _id: string;
  name: string;
  isArchived?: boolean;
};

type CategoryGroup = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
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
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

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
      if (!budget) return;
      if (!budget.categoryBudgets.length) {
        setTransactions([]);
        return;
      }
      const categoryIds = budget.categoryBudgets.map((entry) => entry.categoryId).join(",");
      const accountIds = budget.accountIds?.join(",") ?? "";
      const params = new URLSearchParams({
        includeArchived: "true",
        kind: "expense",
      });

      if (categoryIds) params.set("categoryIds", categoryIds);
      if (accountIds) params.set("accountIds", accountIds);

      if (budget.type === "monthly") {
        if (!selectedMonth) return;
        const range = monthRange(selectedMonth);
        params.set("startDate", range.start);
        const endDate = new Date(`${range.end}T00:00:00.000Z`);
        endDate.setUTCDate(endDate.getUTCDate() - 1);
        params.set("endDate", endDate.toISOString().slice(0, 10));
      } else if (budget.startDate && budget.endDate) {
        params.set("startDate", budget.startDate.slice(0, 10));
        params.set("endDate", budget.endDate.slice(0, 10));
      }

      const response = await getJSON<ApiItemResponse<{ items: Transaction[] }>>(
        `/api/transactions?${params.toString()}`
      );
      setTransactions(response.data.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budgets_generic_error");
      setToast(message);
    }
  }, [budget, locale, selectedMonth]);

  const loadMeta = useCallback(async () => {
    try {
      const [categoriesResponse, accountsResponse, groupsResponse] = await Promise.all([
        getJSON<ApiListResponse<Category>>("/api/categories?includeArchived=true"),
        getJSON<ApiListResponse<Account>>("/api/accounts?includeArchived=true"),
        getJSON<ApiListResponse<CategoryGroup>>("/api/category-groups?includeArchived=true"),
      ]);
      setCategories(categoriesResponse.data);
      setAccounts(accountsResponse.data);
      setCategoryGroups(groupsResponse.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budgets_generic_error");
      setToast(message);
    }
  }, [locale]);

  useEffect(() => {
    void loadBudget();
    void loadMeta();
  }, [loadBudget, loadMeta]);

  useEffect(() => {
    if (!budget) return;
    if (budget.type === "monthly") {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      if (!selectedMonth) {
        if (budget.startMonth && currentMonth < budget.startMonth) {
          setSelectedMonth(budget.startMonth);
        } else {
          setSelectedMonth(currentMonth);
        }
      }
    }
  }, [budget, selectedMonth]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

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
    if (budget.type === "monthly") {
      if (!selectedMonth) return null;
      const range = monthRange(selectedMonth);
      const start = new Date(`${range.start}T00:00:00.000Z`);
      const end = new Date(`${range.end}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() - 1);
      return { start, end };
    }
    if (budget.startDate && budget.endDate) {
      return { start: new Date(budget.startDate), end: new Date(budget.endDate) };
    }
    return null;
  }, [budget, selectedMonth]);

  const isInRange = useCallback(
    (transaction: Transaction) => {
      if (!dateRange) return true;
      const date = new Date(transaction.date);
      return date >= dateRange.start && date <= dateRange.end;
    },
    [dateRange]
  );

  const spendMinor = useMemo(() => {
    if (!budget) return 0;
    return transactions
      .filter((transaction) => transaction.kind === "expense")
      .filter((transaction) => isInRange(transaction))
      .reduce((sum, transaction) => sum + transaction.amountMinor, 0);
  }, [budget, isInRange, transactions]);

  const totalBudgetMinor = budget?.totalBudgetMinor ?? 0;
  const remainingMinor = totalBudgetMinor - spendMinor;
  const progress = totalBudgetMinor ? Math.min(spendMinor / totalBudgetMinor, 1) : 0;

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
  }, [categoryMap, isInRange, locale, transactions]);

  const formatBudgetDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return formatDateOnly(date.toISOString().slice(0, 10), locale);
  };

  const periodLabel =
    budget?.type === "monthly"
      ? `${t(locale, "budgets_start_month_label")} ${formatMonthLabel(
          budget.startMonth ?? selectedMonth,
          locale
        )}`
      : budget
        ? `${formatBudgetDate(budget.startDate ?? "")} → ${formatBudgetDate(
            budget.endDate ?? ""
          )}`
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
          <h1 className="page-title mt-2">
            {budget.emoji ? `${budget.emoji} ` : ""}
            {budget.name}
          </h1>
          <p className="mt-1 opacity-70">{periodLabel}</p>
          {budget.type === "monthly" ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium opacity-70">
                  {t(locale, "budgets_month_selector")}
                </span>
                <input
                  type="month"
                  className="input input-bordered input-sm bg-base-100"
                  value={selectedMonth}
                  min={budget.startMonth ?? undefined}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                />
              </label>
              <span className="text-xs opacity-60">{t(locale, "budgets_month_help")}</span>
            </div>
          ) : null}
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
            <p className="text-xs opacity-60">
              {formatCurrency(remainingMinor ?? 0, defaultCurrency, locale)}{" "}
              {t(locale, "budgets_remaining_label")}
            </p>
            <ProgressBar value={progress} />
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
            <p className="text-sm font-semibold">{t(locale, "budgets_overview_total")}</p>
            <p className="text-sm opacity-70">
              {formatCurrency(totalBudgetMinor, defaultCurrency, locale)}
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
                          defaultCurrency,
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
        categoryGroups={categoryGroups}
        initialBudget={budget}
      />
    </section>
  );
}
