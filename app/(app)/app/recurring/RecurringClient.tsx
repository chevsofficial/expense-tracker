"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type Recurring = {
  _id: string;
  name: string;
  amountMinor: number;
  currency: string;
  kind: "expense" | "income";
  categoryId?: string | null;
  merchantId?: string | null;
  schedule: {
    frequency: "monthly" | "weekly";
    interval: number;
    dayOfMonth?: number;
  };
  startDate: string;
  nextRunAt: string;
  isArchived: boolean;
};

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  isArchived?: boolean;
};

type Merchant = {
  _id: string;
  name: string;
  isArchived?: boolean;
};

type ApiListResponse<T> = { data: T[] };
type ApiItemResponse<T> = { data: T };

const getTodayInput = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

type RecurringForm = {
  name: string;
  amount: string;
  currency: string;
  kind: "expense" | "income";
  categoryId: string;
  merchantId: string;
  frequency: "monthly" | "weekly";
  interval: string;
  dayOfMonth: string;
  startDate: string;
};

export function RecurringClient({ locale, defaultCurrency }: { locale: Locale; defaultCurrency: string }) {
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [formState, setFormState] = useState<RecurringForm>({
    name: "",
    amount: "",
    currency: defaultCurrency,
    kind: "expense",
    categoryId: "uncategorized",
    merchantId: "unassigned",
    frequency: "monthly",
    interval: "1",
    dayOfMonth: "1",
    startDate: getTodayInput(),
  });

  const categoryName = useCallback(
    (category?: Category | null) =>
      category?.nameCustom?.trim() || category?.nameKey || t(locale, "category_fallback_name"),
    [locale]
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(category._id, categoryName(category)));
    return map;
  }, [categories, categoryName]);

  const merchantMap = useMemo(() => {
    const map = new Map<string, string>();
    merchants.forEach((merchant) => map.set(merchant._id, merchant.name));
    return map;
  }, [merchants]);

  const scheduleLabel = useCallback(
    (item: Recurring) => {
      if (item.schedule.frequency === "monthly") {
        return `${t(locale, "recurring_every")} ${item.schedule.interval} ${t(
          locale,
          "recurring_months"
        )} ${t(locale, "recurring_on_day")} ${item.schedule.dayOfMonth ?? 1}`;
      }
      return `${t(locale, "recurring_every")} ${item.schedule.interval} ${t(
        locale,
        "recurring_weeks"
      )}`;
    },
    [locale]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recurringResponse, categoryResponse, merchantsResponse] = await Promise.all([
        getJSON<ApiListResponse<Recurring>>("/api/recurring"),
        getJSON<ApiListResponse<Category>>("/api/categories?includeArchived=false"),
        getJSON<ApiListResponse<Merchant>>("/api/merchants?includeArchived=false"),
      ]);
      setRecurring(recurringResponse.data);
      setCategories(categoryResponse.data);
      setMerchants(merchantsResponse.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "recurring_generic_error");
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditing(null);
    setFormState({
      name: "",
      amount: "",
      currency: defaultCurrency,
      kind: "expense",
      categoryId: "uncategorized",
      merchantId: "unassigned",
      frequency: "monthly",
      interval: "1",
      dayOfMonth: "1",
      startDate: getTodayInput(),
    });
    setModalOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number(formState.amount);
    const intervalValue = Number(formState.interval);
    const dayValue = Number(formState.dayOfMonth);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setToast(t(locale, "transactions_amount_invalid"));
      return;
    }
    if (!Number.isInteger(intervalValue) || intervalValue < 1) {
      setToast(t(locale, "recurring_interval_invalid"));
      return;
    }
    if (formState.frequency === "monthly" && (!Number.isInteger(dayValue) || dayValue < 1 || dayValue > 31)) {
      setToast(t(locale, "recurring_day_of_month_invalid"));
      return;
    }

    const payload = {
      name: formState.name,
      amount: amountValue,
      currency: formState.currency,
      kind: formState.kind,
      categoryId: formState.categoryId === "uncategorized" ? null : formState.categoryId,
      merchantId: formState.merchantId === "unassigned" ? null : formState.merchantId,
      schedule: {
        frequency: formState.frequency,
        interval: intervalValue,
        ...(formState.frequency === "monthly" ? { dayOfMonth: dayValue } : {}),
      },
      startDate: formState.startDate,
    };

    try {
      if (editing) {
        await putJSON<ApiItemResponse<Recurring>>(`/api/recurring/${editing._id}`, payload);
      } else {
        await postJSON<ApiItemResponse<Recurring>>("/api/recurring", payload);
      }
      resetForm();
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "recurring_generic_error");
      setToast(message);
    }
  };

  const handleEdit = (item: Recurring) => {
    setEditing(item);
    setFormState({
      name: item.name,
      amount: (item.amountMinor / 100).toFixed(2),
      currency: item.currency,
      kind: item.kind,
      categoryId: item.categoryId ?? "uncategorized",
      merchantId: item.merchantId ?? "unassigned",
      frequency: item.schedule.frequency,
      interval: String(item.schedule.interval),
      dayOfMonth: item.schedule.dayOfMonth ? String(item.schedule.dayOfMonth) : "1",
      startDate: item.startDate ? item.startDate.slice(0, 10) : getTodayInput(),
    });
    setModalOpen(true);
  };

  const handleDeactivate = async (item: Recurring) => {
    try {
      await delJSON<ApiItemResponse<Recurring>>(`/api/recurring/${item._id}`);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "recurring_generic_error");
      setToast(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t(locale, "recurring_title")}</h1>
        <button className="btn btn-primary" type="button" onClick={() => setModalOpen(true)}>
          {t(locale, "recurring_add")}
        </button>
      </div>

      {toast ? (
        <div className="alert alert-error">
          <span>{toast}</span>
          <button className="btn btn-sm" onClick={() => setToast(null)}>
            {t(locale, "transactions_dismiss")}
          </button>
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        title={editing ? t(locale, "recurring_edit") : t(locale, "recurring_add")}
        onClose={resetForm}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_name")}</span>
              <input
                className="input input-bordered"
                value={formState.name}
                onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_amount")}</span>
              <input
                className="input input-bordered"
                type="number"
                min="0"
                step="0.01"
                value={formState.amount}
                onChange={(event) => setFormState({ ...formState, amount: event.target.value })}
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_currency")}</span>
              <input
                className="input input-bordered"
                value={formState.currency}
                onChange={(event) => setFormState({ ...formState, currency: event.target.value })}
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_kind")}</span>
              <select
                className="select select-bordered"
                value={formState.kind}
                onChange={(event) =>
                  setFormState({ ...formState, kind: event.target.value as Recurring["kind"] })
                }
              >
                <option value="expense">{t(locale, "category_kind_expense")}</option>
                <option value="income">{t(locale, "category_kind_income")}</option>
              </select>
            </label>
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_category")}</span>
              <select
                className="select select-bordered"
                value={formState.categoryId}
                onChange={(event) => setFormState({ ...formState, categoryId: event.target.value })}
              >
                <option value="uncategorized">{t(locale, "transactions_uncategorized")}</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {categoryName(category)}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_merchant")}</span>
              <select
                className="select select-bordered"
                value={formState.merchantId}
                onChange={(event) => setFormState({ ...formState, merchantId: event.target.value })}
              >
                <option value="unassigned">{t(locale, "recurring_merchant_unassigned")}</option>
                {merchants.map((merchant) => (
                  <option key={merchant._id} value={merchant._id}>
                    {merchant.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_frequency")}</span>
              <select
                className="select select-bordered"
                value={formState.frequency}
                onChange={(event) =>
                  setFormState({
                    ...formState,
                    frequency: event.target.value as RecurringForm["frequency"],
                  })
                }
              >
                <option value="monthly">{t(locale, "recurring_frequency_monthly")}</option>
                <option value="weekly">{t(locale, "recurring_frequency_weekly")}</option>
              </select>
            </label>
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_interval")}</span>
              <input
                className="input input-bordered"
                type="number"
                min="1"
                value={formState.interval}
                onChange={(event) => setFormState({ ...formState, interval: event.target.value })}
              />
            </label>
            {formState.frequency === "monthly" ? (
              <label className="form-control w-full">
                <span className="label-text">{t(locale, "recurring_day_of_month")}</span>
                <input
                  className="input input-bordered"
                  type="number"
                  min="1"
                  max="31"
                  value={formState.dayOfMonth}
                  onChange={(event) => setFormState({ ...formState, dayOfMonth: event.target.value })}
                />
              </label>
            ) : null}
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_start_date")}</span>
              <input
                className="input input-bordered"
                type="date"
                value={formState.startDate}
                onChange={(event) => setFormState({ ...formState, startDate: event.target.value })}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" type="button" onClick={resetForm}>
              {t(locale, "recurring_cancel")}
            </button>
            <button className="btn btn-primary" type="submit">
              {editing ? t(locale, "recurring_save") : t(locale, "recurring_add")}
            </button>
          </div>
        </form>
      </Modal>

      {loading ? (
        <p className="text-sm opacity-60">{t(locale, "recurring_loading")}</p>
      ) : recurring.length ? (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table">
            <thead>
              <tr>
                <th>{t(locale, "recurring_name")}</th>
                <th>{t(locale, "recurring_amount")}</th>
                <th>{t(locale, "recurring_category")}</th>
                <th>{t(locale, "recurring_merchant")}</th>
                <th>{t(locale, "recurring_schedule")}</th>
                <th>{t(locale, "recurring_next_run")}</th>
                <th>{t(locale, "recurring_status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recurring.map((item) => (
                <tr key={item._id} className={item.isArchived ? "opacity-60" : ""}>
                  <td>{item.name}</td>
                  <td>
                    {(item.amountMinor / 100).toLocaleString(locale, {
                      style: "currency",
                      currency: item.currency,
                    })}
                  </td>
                  <td>{item.categoryId ? categoryMap.get(item.categoryId) : "-"}</td>
                  <td>{item.merchantId ? merchantMap.get(item.merchantId) : "-"}</td>
                  <td>
                    {scheduleLabel(item)}
                  </td>
                  <td>
                    {new Date(item.nextRunAt).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td>{item.isArchived ? t(locale, "recurring_status_archived") : t(locale, "recurring_status_active")}</td>
                  <td className="flex gap-2">
                    <button className="btn btn-xs" type="button" onClick={() => handleEdit(item)}>
                      {t(locale, "recurring_edit")}
                    </button>
                    {!item.isArchived ? (
                      <button
                        className="btn btn-ghost btn-xs"
                        type="button"
                        onClick={() => handleDeactivate(item)}
                      >
                        {t(locale, "recurring_delete")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm opacity-60">{t(locale, "recurring_empty")}</p>
      )}
    </div>
  );
}
