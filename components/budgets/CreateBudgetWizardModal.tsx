"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { formatDateOnly } from "@/src/utils/dateOnly";
import { formatMonthLabel, monthRange } from "@/src/utils/month";
import { postJSON, putJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

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

export type Budget = {
  _id: string;
  name: string;
  emoji?: string | null;
  color?: string | null;
  isDefault: boolean;
  type: "monthly" | "custom";
  month?: string | null;
  startDate: string;
  endDate: string;
  categoryIds: string[] | null;
  accountIds: string[] | null;
  limitAmount: number | null;
  alerts?: { enabled: boolean; thresholds: number[] };
  archivedAt?: string | null;
};

type BudgetFormState = {
  name: string;
  emoji: string;
  color: string;
  isDefault: boolean;
  type: "monthly" | "custom";
  month: string;
  startDate: string;
  endDate: string;
  categoryIds: string[] | null;
  accountIds: string[] | null;
  limitAmount: string;
  alerts: { enabled: boolean; thresholds: number[] };
};

type ApiItemResponse<T> = { data: T };

const thresholds = [75, 90, 100];

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
  initialBudget,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (budget: Budget) => void;
  locale: Locale;
  defaultCurrency: string;
  categories: Category[];
  accounts: Account[];
  initialBudget?: Budget | null;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialState = useMemo<BudgetFormState>(() => {
    const month = initialBudget?.month ?? getCurrentMonth();
    const range = getMonthStartEnd(month);
    return {
      name: initialBudget?.name ?? "",
      emoji: initialBudget?.emoji ?? "",
      color: initialBudget?.color ?? "",
      isDefault: initialBudget?.isDefault ?? false,
      type: initialBudget?.type ?? "monthly",
      month,
      startDate: normalizeBudgetDate(initialBudget?.startDate) || range.start,
      endDate: normalizeBudgetDate(initialBudget?.endDate) || range.end,
      categoryIds: initialBudget?.categoryIds ?? null,
      accountIds: initialBudget?.accountIds ?? null,
      limitAmount:
        initialBudget?.limitAmount !== null && initialBudget?.limitAmount !== undefined
          ? String(initialBudget.limitAmount)
          : "",
      alerts: initialBudget?.alerts ?? { enabled: true, thresholds: thresholds.slice() },
    };
  }, [initialBudget]);

  const [formState, setFormState] = useState<BudgetFormState>(initialState);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError(null);
    setFormState(initialState);
  }, [open, initialState]);

  useEffect(() => {
    if (formState.type !== "monthly") return;
    const range = getMonthStartEnd(formState.month);
    setFormState((prev) => ({
      ...prev,
      startDate: range.start,
      endDate: range.end,
    }));
  }, [formState.type, formState.month]);

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

  const handleThresholdToggle = (value: number) => {
    const next = new Set(formState.alerts.thresholds);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    setFormState({
      ...formState,
      alerts: { ...formState.alerts, thresholds: Array.from(next).sort((a, b) => a - b) },
    });
  };

  const handleLimitChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, limitAmount: event.target.value });
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
        isDefault: formState.isDefault,
        type: formState.type,
        month: formState.type === "monthly" ? formState.month : null,
        startDate: formState.startDate,
        endDate: formState.endDate,
        categoryIds: formState.categoryIds,
        accountIds: formState.accountIds,
        limitAmount: formState.limitAmount ? Number(formState.limitAmount) : null,
        alerts: formState.alerts,
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

  const limitLabel = formState.limitAmount
    ? `${formState.limitAmount} ${defaultCurrency}`
    : t(locale, "budgets_track_only");

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
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">{t(locale, "budgets_color")}</span>
              <input
                type="color"
                className="input input-bordered h-12"
                value={formState.color || "#2563eb"}
                onChange={(event) => setFormState({ ...formState, color: event.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={formState.isDefault}
                onChange={(event) =>
                  setFormState({ ...formState, isDefault: event.target.checked })
                }
              />
              <span>{t(locale, "budgets_default")}</span>
            </label>
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
                  className="select select-bordered"
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
                    className="input input-bordered"
                    value={formState.month}
                    onChange={(event) => setFormState({ ...formState, month: event.target.value })}
                  />
                  <span className="mt-1 text-xs opacity-60">
                    {formatMonthLabel(formState.month, locale)}
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
                  />
                  <TextField
                    id="budget-end-date"
                    label={t(locale, "budgets_end_date")}
                    type="date"
                    value={formState.endDate}
                    onChange={(event) =>
                      setFormState({ ...formState, endDate: event.target.value })
                    }
                  />
                </>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t(locale, "budgets_scope_categories")}</p>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={formState.categoryIds === null}
                    onChange={(event) =>
                      setFormState({
                        ...formState,
                        categoryIds: event.target.checked ? null : [],
                      })
                    }
                  />
                  {t(locale, "budgets_scope_all_categories")}
                </label>
              </div>
              {formState.categoryIds === null ? (
                <p className="text-xs opacity-60">{t(locale, "budgets_scope_all_categories")}</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {categories
                    .filter((category) => !category.isArchived)
                    .map((category) => (
                      <label key={category._id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary checkbox-sm"
                          checked={selectedCategories.includes(category._id)}
                          onChange={() => toggleCategory(category._id)}
                        />
                        <span>{category.nameCustom?.trim() || category.nameKey || "Category"}</span>
                      </label>
                    ))}
                </div>
              )}
            </div>

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
                      <label key={account._id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary checkbox-sm"
                          checked={selectedAccounts.includes(account._id)}
                          onChange={() => toggleAccount(account._id)}
                        />
                        <span>{account.name}</span>
                      </label>
                    ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                id="budget-limit"
                label={t(locale, "budgets_limit")}
                type="number"
                step="0.01"
                value={formState.limitAmount}
                onChange={handleLimitChange}
                placeholder={t(locale, "budgets_limit_placeholder")}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={!formState.limitAmount}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      limitAmount: event.target.checked ? "" : formState.limitAmount,
                    })
                  }
                />
                <span>{t(locale, "budgets_track_only")}</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={formState.alerts.enabled}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      alerts: { ...formState.alerts, enabled: event.target.checked },
                    })
                  }
                />
                <span>{t(locale, "budgets_alerts_enabled")}</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {thresholds.map((value) => (
                  <label key={value} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-xs"
                      checked={formState.alerts.thresholds.includes(value)}
                      onChange={() => handleThresholdToggle(value)}
                      disabled={!formState.alerts.enabled}
                    />
                    {value}%
                  </label>
                ))}
              </div>
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
                  ? formatMonthLabel(formState.month, locale)
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
              <p className="text-sm opacity-70">{limitLabel}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">{t(locale, "budgets_review_alerts")}</p>
              <p className="text-sm opacity-70">
                {formState.alerts.enabled
                  ? formState.alerts.thresholds.join("%, ") + "%"
                  : t(locale, "budgets_alerts_disabled")}
              </p>
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
