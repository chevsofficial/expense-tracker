"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { BudgetColorPicker } from "@/components/budgets/BudgetColorPicker";
import { CategoryMultiSelect } from "@/components/budgets/CategoryMultiSelect";
import { formatDateOnly } from "@/src/utils/dateOnly";
import { formatMonthLabel, monthRange } from "@/src/utils/month";
import { postJSON, putJSON } from "@/src/lib/apiClient";
import { formatCurrency } from "@/src/lib/format";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type Category = {
  _id: string;
  groupId: string;
  nameKey?: string;
  nameCustom?: string;
  emoji?: string | null;
  kind?: "expense" | "income";
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

type CategoryBudget = {
  categoryId: string;
  amountMinor: number;
};

export type Budget = {
  _id: string;
  name: string;
  emoji?: string | null;
  color?: string | null;
  type: "monthly" | "custom";
  startMonth?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  categoryIds: string[] | null;
  accountIds: string[] | null;
  categoryBudgets: CategoryBudget[];
  totalBudgetMinor: number;
  pinnedAt?: string | null;
  archivedAt?: string | null;
};

type BudgetFormState = {
  name: string;
  emoji: string;
  color: string;
  type: "monthly" | "custom";
  startMonth: string;
  startDate: string;
  endDate: string;
  categoryIds: string[] | null;
  accountIds: string[] | null;
  categoryBudgets: Record<string, string>;
};

type ApiItemResponse<T> = { data: T };

const getCurrentMonth = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

const getMonthStartEnd = (month: string) => {
  const { start, end } = monthRange(month);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const endYmd = endDate.toISOString().slice(0, 10);
  return { start, end: endYmd };
};

const normalizeBudgetDate = (value?: string) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export function CreateBudgetWizardModal({
  open,
  onClose,
  onSaved,
  locale,
  defaultCurrency,
  categories,
  accounts,
  categoryGroups,
  initialBudget,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (budget: Budget) => void;
  locale: Locale;
  defaultCurrency: string;
  categories: Category[];
  accounts: Account[];
  categoryGroups: CategoryGroup[];
  initialBudget?: Budget | null;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialState = useMemo<BudgetFormState>(() => {
    const currentMonth = getCurrentMonth();
    const range = getMonthStartEnd(currentMonth);
    return {
      name: initialBudget?.name ?? "",
      emoji: initialBudget?.emoji ?? "",
      color: initialBudget?.color ?? "",
      type: initialBudget?.type ?? "monthly",
      startMonth: initialBudget?.startMonth ?? currentMonth,
      startDate: normalizeBudgetDate(initialBudget?.startDate) || range.start,
      endDate: normalizeBudgetDate(initialBudget?.endDate) || range.end,
      categoryIds: initialBudget?.categoryIds ?? null,
      accountIds: initialBudget?.accountIds ?? null,
      categoryBudgets:
        initialBudget?.categoryBudgets?.reduce<Record<string, string>>((acc, entry) => {
          acc[entry.categoryId] = (entry.amountMinor / 100).toFixed(2);
          return acc;
        }, {}) ?? {},
    };
  }, [initialBudget]);

  const [formState, setFormState] = useState<BudgetFormState>(initialState);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError(null);
    setFormState(initialState);
  }, [open, initialState]);

  const selectedCategories = formState.categoryIds ?? [];
  const selectedAccounts = formState.accountIds ?? [];

  const toggleCategory = (id: string) => {
    if (!formState.categoryIds) return;
    const next = new Set(formState.categoryIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setFormState({ ...formState, categoryIds: Array.from(next) });
  };

  const toggleAccount = (id: string) => {
    if (!formState.accountIds) return;
    const next = new Set(formState.accountIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setFormState({ ...formState, accountIds: Array.from(next) });
  };

  const expenseCategories = useMemo(
    () =>
      categories.filter(
        (category) => !category.isArchived && (category.kind ?? "expense") === "expense"
      ),
    [categories]
  );

  const budgetCategoryIds =
    formState.categoryIds === null
      ? expenseCategories.map((category) => category._id)
      : formState.categoryIds;

  const budgetCategories = useMemo(
    () => expenseCategories.filter((category) => budgetCategoryIds.includes(category._id)),
    [budgetCategoryIds, expenseCategories]
  );

  const totalBudgetMinor = useMemo(
    () =>
      budgetCategories.reduce((sum, category) => {
        const raw = formState.categoryBudgets[category._id];
        const value = raw ? Number.parseFloat(raw) : 0;
        return sum + (Number.isFinite(value) ? Math.round(value * 100) : 0);
      }, 0),
    [budgetCategories, formState.categoryBudgets]
  );

  const handleBudgetAmountChange = (categoryId: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      categoryBudgets: { ...prev.categoryBudgets, [categoryId]: value },
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: formState.name.trim(),
        emoji: formState.emoji.trim() || null,
        color: formState.color.trim() || null,
        type: formState.type,
        startMonth: formState.type === "monthly" ? formState.startMonth : undefined,
        startDate: formState.type === "custom" ? formState.startDate : undefined,
        endDate: formState.type === "custom" ? formState.endDate : undefined,
        categoryIds: formState.categoryIds,
        accountIds: formState.accountIds,
        categoryBudgets: budgetCategories.map((category) => ({
          categoryId: category._id,
          amount: formState.categoryBudgets[category._id]
            ? Number.parseFloat(formState.categoryBudgets[category._id])
            : 0,
        })),
      };
      const response = initialBudget
        ? await putJSON<ApiItemResponse<Budget>>(`/api/budgets/${initialBudget._id}`, payload)
        : await postJSON<ApiItemResponse<Budget>>("/api/budgets", payload);
      onSaved(response.data);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "budgets_generic_error");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = [
    t(locale, "budgets_step_basics"),
    t(locale, "budgets_step_scope"),
    t(locale, "budgets_step_limits"),
    t(locale, "budgets_step_review"),
  ];

  const reviewCategoryLabel =
    formState.categoryIds === null
      ? t(locale, "budgets_scope_all_categories")
      : `${formState.categoryIds.length} ${t(locale, "budgets_scope_categories_selected")}`;

  const reviewAccountLabel =
    formState.accountIds === null
      ? t(locale, "budgets_scope_all_accounts")
      : `${formState.accountIds.length} ${t(locale, "budgets_scope_accounts_selected")}`;

  const totalBudgetLabel = formatCurrency(totalBudgetMinor, defaultCurrency, locale);

  return (
    <Modal
      open={open}
      title={
        initialBudget ? t(locale, "budgets_edit_title") : t(locale, "budgets_create_title")
      }
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex flex-wrap gap-2">
          {stepLabels.map((label, index) => (
            <span
              key={label}
              className={`badge badge-outline ${index === step ? "badge-primary" : ""}`}
            >
              {label}
            </span>
          ))}
        </div>

        {error ? (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        ) : null}

        {step === 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <TextField
              id="budget-name"
              label={t(locale, "budgets_name")}
              value={formState.name}
              onChange={(event) => setFormState({ ...formState, name: event.target.value })}
              placeholder={t(locale, "budgets_name_placeholder")}
            />
            <TextField
              id="budget-emoji"
              label={t(locale, "budgets_emoji")}
              value={formState.emoji}
              onChange={(event) => setFormState({ ...formState, emoji: event.target.value })}
              placeholder="💡"
            />
            <BudgetColorPicker
              value={formState.color || "#2563eb"}
              onChange={(value) => setFormState({ ...formState, color: value })}
              label={t(locale, "budgets_color")}
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="form-control w-full">
                <span className="label-text mb-1 text-sm font-medium">
                  {t(locale, "budgets_type")}
                </span>
                <select
                  className="select select-bordered bg-base-100 w-full"
                  value={formState.type}
                  onChange={(event) =>
                    setFormState({ ...formState, type: event.target.value as "monthly" | "custom" })
                  }
                >
                  <option value="monthly">{t(locale, "budgets_type_monthly")}</option>
                  <option value="custom">{t(locale, "budgets_type_custom")}</option>
                </select>
              </label>
              {formState.type === "monthly" ? (
                <label className="form-control w-full">
                  <span className="label-text mb-1 text-sm font-medium">
                    {t(locale, "budgets_month")}
                  </span>
                  <input
                    type="month"
                    className="input input-bordered bg-base-100 w-full"
                    value={formState.startMonth}
                    onChange={(event) =>
                      setFormState({ ...formState, startMonth: event.target.value })
                    }
                  />
                  <span className="mt-1 text-xs opacity-60">
                    {t(locale, "budgets_month_help")} {formatMonthLabel(formState.startMonth, locale)}
                  </span>
                </label>
              ) : (
                <>
                  <TextField
                    id="budget-start-date"
                    label={t(locale, "budgets_start_date")}
                    type="date"
                    value={formState.startDate}
                    onChange={(event) =>
                      setFormState({ ...formState, startDate: event.target.value })
                    }
                    inputClassName="bg-base-100"
                  />
                  <TextField
                    id="budget-end-date"
                    label={t(locale, "budgets_end_date")}
                    type="date"
                    value={formState.endDate}
                    onChange={(event) =>
                      setFormState({ ...formState, endDate: event.target.value })
                    }
                    inputClassName="bg-base-100"
                  />
                </>
              )}
            </div>

            <CategoryMultiSelect
              categories={expenseCategories}
              groups={categoryGroups}
              selectedIds={selectedCategories}
              allSelected={formState.categoryIds === null}
              onToggleAll={(checked) =>
                setFormState({
                  ...formState,
                  categoryIds: checked ? null : [],
                })
              }
              onToggleCategory={toggleCategory}
              label={t(locale, "budgets_scope_categories")}
              allLabel={t(locale, "budgets_scope_all_categories")}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t(locale, "budgets_scope_accounts")}</p>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={formState.accountIds === null}
                    onChange={(event) =>
                      setFormState({
                        ...formState,
                        accountIds: event.target.checked ? null : [],
                      })
                    }
                  />
                  {t(locale, "budgets_scope_all_accounts")}
                </label>
              </div>
              {formState.accountIds === null ? (
                <p className="text-xs opacity-60">{t(locale, "budgets_scope_all_accounts")}</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {accounts
                    .filter((account) => !account.isArchived)
                    .map((account) => (
                      <button
                        key={account._id}
                        type="button"
                        className="flex items-center gap-2 rounded-lg border border-base-200 bg-base-100 px-3 py-2 text-left text-sm"
                        onClick={() => toggleAccount(account._id)}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                            selectedAccounts.includes(account._id)
                              ? "border-primary bg-primary text-primary-content"
                              : "border-base-300 bg-base-100 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span>{account.name}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {budgetCategories.length ? (
                <div className="space-y-3">
                  {budgetCategories.map((category) => (
                    <label
                      key={category._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-base-200 bg-base-100 px-3 py-2 text-sm"
                    >
                      <span>
                        {category.emoji ? `${category.emoji} ` : ""}
                        {category.nameCustom?.trim() || category.nameKey || "Category"}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        className="input input-bordered input-sm w-32 bg-base-100 text-right"
                        value={formState.categoryBudgets[category._id] ?? ""}
                        onChange={(event) =>
                          handleBudgetAmountChange(category._id, event.target.value)
                        }
                        placeholder="0.00"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm opacity-60">{t(locale, "budgets_no_categories_selected")}</p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-base-200 bg-base-100 px-3 py-2 text-sm font-semibold">
              <span>{t(locale, "budgets_total_budget")}</span>
              <span>{totalBudgetLabel}</span>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3 rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold">{t(locale, "budgets_review_name")}</p>
              <p className="text-sm opacity-70">
                {formState.emoji ? `${formState.emoji} ` : ""}
                {formState.name || t(locale, "budgets_name_placeholder")}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">{t(locale, "budgets_review_period")}</p>
              <p className="text-sm opacity-70">
                {formState.type === "monthly"
                  ? `${t(locale, "budgets_start_month_label")} ${formatMonthLabel(
                      formState.startMonth,
                      locale
                    )}`
                  : `${formatDateOnly(formState.startDate, locale)} → ${formatDateOnly(
                      formState.endDate,
                      locale
                    )}`}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">{t(locale, "budgets_review_scope")}</p>
              <p className="text-sm opacity-70">
                {reviewCategoryLabel} · {reviewAccountLabel}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">{t(locale, "budgets_review_limit")}</p>
              <p className="text-sm opacity-70">{totalBudgetLabel}</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0}
          >
            {t(locale, "budgets_back")}
          </button>
          <div className="flex gap-2">
            {step < stepLabels.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep((current) => Math.min(stepLabels.length - 1, current + 1))}
                disabled={!formState.name.trim()}
              >
                {t(locale, "budgets_next")}
              </button>
            ) : (
              <SubmitButton isLoading={submitting}>
                {initialBudget ? t(locale, "budgets_save") : t(locale, "budgets_create_action")}
              </SubmitButton>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
