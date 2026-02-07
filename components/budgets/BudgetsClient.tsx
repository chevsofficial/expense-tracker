"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/budget/ProgressBar";
import { CreateBudgetWizardModal, type Budget } from "@/components/budgets/CreateBudgetWizardModal";
import { SurfaceCard, SurfaceCardBody } from "@/components/ui/SurfaceCard";
import { getJSON, putJSON } from "@/src/lib/apiClient";
import { formatDateOnly } from "@/src/utils/dateOnly";
import { formatMonthLabel } from "@/src/utils/month";
import { formatCurrency } from "@/src/lib/format";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type BudgetSummary = Budget & { spentMinor?: number };

type ApiListResponse<T> = { data: T[] };
type ApiItemResponse<T> = { data: T };

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  isArchived?: boolean;
};

type Account = {
  _id: string;
  name: string;
  isArchived?: boolean;
};

export function BudgetsClient({
  locale,
  defaultCurrency,
}: {
  locale: Locale;
  defaultCurrency: string;
}) {
  const router = useRouter();
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getJSON<ApiListResponse<BudgetSummary>>(
        "/api/budgets?includeArchived=true&includeSummary=true"
      );
      setBudgets(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budgets_generic_error");
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [locale]);

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
    void loadBudgets();
    void loadMeta();
  }, [loadBudgets, loadMeta]);

  const activeBudgets = useMemo(
    () => budgets.filter((budget) => !budget.archivedAt),
    [budgets]
  );
  const archivedBudgets = useMemo(
    () => budgets.filter((budget) => budget.archivedAt),
    [budgets]
  );

  const handleSaved = async (budget: Budget) => {
    setEditingBudget(null);
    await loadBudgets();
    router.push(`/app/budgets/${budget._id}`);
  };

  const handleArchiveToggle = async (budget: BudgetSummary) => {
    setIsSubmitting(true);
    try {
      const payload = { archivedAt: budget.archivedAt ? null : new Date().toISOString() };
      await putJSON<ApiItemResponse<Budget>>(`/api/budgets/${budget._id}`, payload);
      await loadBudgets();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budgets_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBudgetDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return formatDateOnly(date.toISOString().slice(0, 10), locale);
  };

  const formatPeriod = (budget: BudgetSummary) => {
    if (budget.type === "monthly" && budget.month) {
      return formatMonthLabel(budget.month, locale);
    }
    return `${formatBudgetDate(budget.startDate)} → ${formatBudgetDate(budget.endDate)}`;
  };

  const renderBudgetCard = (budget: BudgetSummary) => {
    const limitMinor =
      budget.limitAmount !== null && budget.limitAmount !== undefined
        ? Math.round(budget.limitAmount * 100)
        : null;
    const spentMinor = budget.spentMinor ?? 0;
    const remainingMinor = limitMinor !== null ? limitMinor - spentMinor : null;
    const progress = limitMinor ? Math.min(spentMinor / limitMinor, 1) : 0;
    return (
      <SurfaceCard key={budget._id}>
        <SurfaceCardBody className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-neutral">
                {budget.emoji ? `${budget.emoji} ` : ""}
                {budget.name}
              </p>
              <p className="text-xs opacity-60">{formatPeriod(budget)}</p>
            </div>
            {budget.isDefault ? (
              <span className="badge badge-primary">{t(locale, "budgets_default_badge")}</span>
            ) : null}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {formatCurrency(spentMinor, defaultCurrency, locale)}{" "}
              <span className="text-xs opacity-60">
                {t(locale, "budgets_spent_label")}
              </span>
            </p>
            {limitMinor !== null ? (
              <p className="text-xs opacity-70">
                {formatCurrency(remainingMinor ?? 0, defaultCurrency, locale)}{" "}
                {t(locale, "budgets_remaining_label")}
              </p>
            ) : (
              <p className="text-xs opacity-70">{t(locale, "budgets_track_only")}</p>
            )}
          </div>
          {limitMinor !== null ? <ProgressBar value={progress} /> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link className="link link-primary text-sm" href={`/app/budgets/${budget._id}`}>
              {t(locale, "budgets_view_details")}
            </Link>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setEditingBudget(budget);
                  setWizardOpen(true);
                }}
              >
                {t(locale, "budgets_edit")}
              </button>
              <button
                className="btn btn-ghost btn-xs text-error"
                onClick={() => handleArchiveToggle(budget)}
                disabled={isSubmitting}
              >
                {budget.archivedAt ? t(locale, "budgets_unarchive") : t(locale, "budgets_archive")}
              </button>
            </div>
          </div>
        </SurfaceCardBody>
      </SurfaceCard>
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral">{t(locale, "budgets_title")}</h1>
          <p className="mt-2 opacity-70">{t(locale, "budgets_subtitle")}</p>
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
          <button className="btn btn-primary btn-sm" onClick={() => setWizardOpen(true)}>
            {t(locale, "budgets_new")}
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

      {loading ? <p className="text-sm opacity-60">{t(locale, "budgets_loading")}</p> : null}

      {!loading && activeBudgets.length === 0 ? (
        <SurfaceCard>
          <SurfaceCardBody className="space-y-2 text-center">
            <p className="text-lg font-semibold">{t(locale, "budgets_empty_title")}</p>
            <p className="text-sm opacity-70">{t(locale, "budgets_empty_subtitle")}</p>
            <button className="btn btn-primary btn-sm" onClick={() => setWizardOpen(true)}>
              {t(locale, "budgets_create_first")}
            </button>
          </SurfaceCardBody>
        </SurfaceCard>
      ) : null}

      {activeBudgets.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeBudgets.map((budget) => renderBudgetCard(budget))}
        </div>
      ) : null}

      {showArchived && archivedBudgets.length ? (
        <details className="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm" open>
          <summary className="cursor-pointer text-sm font-semibold">
            {t(locale, "budgets_archived_section")}
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archivedBudgets.map((budget) => renderBudgetCard(budget))}
          </div>
        </details>
      ) : null}

      <CreateBudgetWizardModal
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setEditingBudget(null);
        }}
        onSaved={handleSaved}
        locale={locale}
        defaultCurrency={defaultCurrency}
        categories={categories}
        accounts={accounts}
        initialBudget={editingBudget}
      />
    </section>
  );
}
