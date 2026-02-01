"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { CategoryPicker } from "@/components/pickers/CategoryPicker";
import { MerchantPicker } from "@/components/pickers/MerchantPicker";
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
  nextRunOn: string;
  isArchived: boolean;
};

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  kind?: "income" | "expense" | "both";
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

const getDayFromDateInput = (value: string) => Number(value.split("-")[2]) || 1;

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
  const [merchantsLoading, setMerchantsLoading] = useState(false);
  const [merchantQuery, setMerchantQuery] = useState("");
  const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false);
  const [creatingMerchant, setCreatingMerchant] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recurringToDelete, setRecurringToDelete] = useState<Recurring | null>(null);
  const [dayOfMonthOverridden, setDayOfMonthOverridden] = useState(false);

  const [formState, setFormState] = useState<RecurringForm>(() => {
    const today = getTodayInput();
    return {
      name: "",
      amount: "",
      currency: defaultCurrency,
      kind: "expense",
      categoryId: "uncategorized",
      merchantId: "unassigned",
      frequency: "monthly",
      interval: "1",
      dayOfMonth: String(getDayFromDateInput(today)),
      startDate: today,
    };
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

  const formatDateOnly = useCallback(
    (value: string) => {
      const date = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return value;
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date);
    },
    [locale]
  );

  const loadMerchants = useCallback(async () => {
    setMerchantsLoading(true);
    try {
      const response = await getJSON<ApiListResponse<Merchant>>(
        "/api/merchants?includeArchived=false"
      );
      setMerchants(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "recurring_generic_error");
      setToast(message);
    } finally {
      setMerchantsLoading(false);
    }
  }, [locale]);

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
    const today = getTodayInput();
    setFormState({
      name: "",
      amount: "",
      currency: defaultCurrency,
      kind: "expense",
      categoryId: "uncategorized",
      merchantId: "unassigned",
      frequency: "monthly",
      interval: "1",
      dayOfMonth: String(getDayFromDateInput(today)),
      startDate: today,
    });
    setModalOpen(false);
    setDayOfMonthOverridden(false);
    setCategoryQuery("");
    setCategoryDropdownOpen(false);
    setMerchantQuery("");
    setMerchantDropdownOpen(false);
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
    const startDate = item.startDate ? item.startDate.slice(0, 10) : getTodayInput();
    const startDay = Number(startDate.split("-")[2]) || 1;
    const dayOfMonth = item.schedule.dayOfMonth ? String(item.schedule.dayOfMonth) : "1";
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
      dayOfMonth,
      startDate,
    });
    setDayOfMonthOverridden(Number(dayOfMonth) !== startDay);
    setCategoryQuery("");
    setCategoryDropdownOpen(false);
    setMerchantQuery("");
    setMerchantDropdownOpen(false);
    setModalOpen(true);
  };

  const handleArchive = async (item: Recurring) => {
    try {
      await putJSON<ApiItemResponse<Recurring>>(`/api/recurring/${item._id}`, {
        isArchived: true,
      });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "recurring_generic_error");
      setToast(message);
    }
  };

  const handleRestore = async (item: Recurring) => {
    try {
      await putJSON<ApiItemResponse<Recurring>>(`/api/recurring/${item._id}`, {
        isArchived: false,
      });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "recurring_generic_error");
      setToast(message);
    }
  };

  const handleDelete = async () => {
    if (!recurringToDelete) return;
    try {
      await delJSON<ApiItemResponse<Recurring>>(`/api/recurring/${recurringToDelete._id}?hard=1`);
      setDeleteConfirmOpen(false);
      setRecurringToDelete(null);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "recurring_generic_error");
      setToast(message);
    }
  };

  const openDeleteModal = (item: Recurring) => {
    setRecurringToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const activeRecurring = useMemo(
    () => recurring.filter((item) => !item.isArchived),
    [recurring]
  );
  const archivedRecurring = useMemo(
    () => recurring.filter((item) => item.isArchived),
    [recurring]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t(locale, "recurring_title")}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            <span>{t(locale, "recurring_show_archived")}</span>
          </label>
          <button className="btn btn-primary" type="button" onClick={() => setModalOpen(true)}>
            {t(locale, "recurring_add")}
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
              <CategoryPicker
                locale={locale}
                categories={categories}
                selectedCategoryId={
                  formState.categoryId === "uncategorized" ? null : formState.categoryId
                }
                query={categoryQuery}
                dropdownOpen={categoryDropdownOpen}
                onDropdownOpenChange={setCategoryDropdownOpen}
                onQueryChange={setCategoryQuery}
                onSelectCategory={(categoryId) =>
                  setFormState((current) => ({
                    ...current,
                    categoryId: categoryId ?? "uncategorized",
                  }))
                }
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_merchant")}</span>
              <MerchantPicker
                locale={locale}
                merchants={merchants}
                merchantsLoading={merchantsLoading}
                selectedMerchantId={
                  formState.merchantId === "unassigned" ? null : formState.merchantId
                }
                selectedMerchantName={undefined}
                query={merchantQuery}
                dropdownOpen={merchantDropdownOpen}
                creatingMerchant={creatingMerchant}
                onDropdownOpenChange={setMerchantDropdownOpen}
                onQueryChange={(value) => {
                  setMerchantQuery(value);
                  setFormState((current) => ({
                    ...current,
                    merchantId: "unassigned",
                  }));
                }}
                onSelectMerchant={(merchant) => {
                  setFormState((current) => ({
                    ...current,
                    merchantId: merchant._id,
                  }));
                  setMerchantDropdownOpen(false);
                  setMerchantQuery("");
                }}
                onCreateMerchant={async () => {
                  const query = merchantQuery.trim();
                  if (query.length < 2) return;
                  setCreatingMerchant(true);
                  try {
                    const response = await postJSON<ApiItemResponse<Merchant>>("/api/merchants", {
                      nameCustom: query,
                    });
                    setMerchants((current) => [response.data, ...current]);
                    setFormState((current) => ({
                      ...current,
                      merchantId: response.data._id,
                    }));
                    setMerchantQuery("");
                    setMerchantDropdownOpen(false);
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : t(locale, "recurring_generic_error");
                    setToast(message);
                  } finally {
                    setCreatingMerchant(false);
                  }
                }}
                onLoadMerchants={() => void loadMerchants()}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_frequency")}</span>
              <select
                className="select select-bordered"
                value={formState.frequency}
                onChange={(event) =>
                  setFormState((current) => {
                    const frequency = event.target.value as RecurringForm["frequency"];
                    if (frequency === "monthly" && !dayOfMonthOverridden) {
                      const startDay = Number(current.startDate.split("-")[2]) || 1;
                      return {
                        ...current,
                        frequency,
                        dayOfMonth: String(startDay),
                      };
                    }
                    return {
                      ...current,
                      frequency,
                    };
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
                  onChange={(event) => {
                    setDayOfMonthOverridden(true);
                    setFormState({ ...formState, dayOfMonth: event.target.value });
                  }}
                />
                <span className="mt-1 text-xs opacity-60">
                  {t(locale, "recurring_day_of_month_help")}
                </span>
              </label>
            ) : null}
            <label className="form-control w-full">
              <span className="label-text">{t(locale, "recurring_start_date")}</span>
              <input
                className="input input-bordered"
                type="date"
                value={formState.startDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormState((current) => {
                    if (current.frequency !== "monthly" || dayOfMonthOverridden) {
                      return { ...current, startDate: value };
                    }
                    const startDay = Number(value.split("-")[2]) || 1;
                    return {
                      ...current,
                      startDate: value,
                      dayOfMonth: String(startDay),
                    };
                  });
                }}
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
      ) : activeRecurring.length || (showArchived && archivedRecurring.length) ? (
        <div className="space-y-6">
          {activeRecurring.length ? (
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
                  {activeRecurring.map((item) => (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>
                        {(item.amountMinor / 100).toLocaleString(locale, {
                          style: "currency",
                          currency: item.currency,
                        })}
                      </td>
                      <td>{item.categoryId ? categoryMap.get(item.categoryId) : "-"}</td>
                      <td>{item.merchantId ? merchantMap.get(item.merchantId) : "-"}</td>
                      <td>{scheduleLabel(item)}</td>
                      <td>{formatDateOnly(item.nextRunOn)}</td>
                      <td>{t(locale, "recurring_status_active")}</td>
                      <td className="flex gap-2">
                        <button
                          className="btn btn-xs"
                          type="button"
                          onClick={() => handleEdit(item)}
                        >
                          {t(locale, "recurring_edit")}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          type="button"
                          onClick={() => handleArchive(item)}
                        >
                          {t(locale, "recurring_archive")}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          type="button"
                          onClick={() => openDeleteModal(item)}
                        >
                          {t(locale, "recurring_delete")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm opacity-60">{t(locale, "recurring_empty")}</p>
          )}
          {showArchived ? (
            archivedRecurring.length ? (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
                  {t(locale, "recurring_archived_section")}
                </h2>
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
                      {archivedRecurring.map((item) => (
                        <tr key={item._id} className="opacity-60">
                          <td>{item.name}</td>
                          <td>
                            {(item.amountMinor / 100).toLocaleString(locale, {
                              style: "currency",
                              currency: item.currency,
                            })}
                          </td>
                          <td>{item.categoryId ? categoryMap.get(item.categoryId) : "-"}</td>
                          <td>{item.merchantId ? merchantMap.get(item.merchantId) : "-"}</td>
                          <td>{scheduleLabel(item)}</td>
                          <td>{formatDateOnly(item.nextRunOn)}</td>
                          <td>{t(locale, "recurring_status_archived")}</td>
                          <td className="flex gap-2">
                            <button
                              className="btn btn-xs"
                              type="button"
                              onClick={() => handleEdit(item)}
                            >
                              {t(locale, "recurring_edit")}
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              type="button"
                              onClick={() => handleRestore(item)}
                            >
                              {t(locale, "recurring_restore")}
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              type="button"
                              onClick={() => openDeleteModal(item)}
                            >
                              {t(locale, "recurring_delete")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm opacity-60">{t(locale, "recurring_archived_empty")}</p>
            )
          ) : null}
        </div>
      ) : (
        <p className="text-sm opacity-60">{t(locale, "recurring_empty")}</p>
      )}

      <Modal
        open={deleteConfirmOpen}
        title={t(locale, "recurring_delete_confirm_title")}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setRecurringToDelete(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm">{t(locale, "recurring_delete_confirm_body")}</p>
          <div className="flex justify-end gap-2">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setRecurringToDelete(null);
              }}
            >
              {t(locale, "recurring_cancel")}
            </button>
            <button className="btn btn-error" type="button" onClick={() => void handleDelete()}>
              {t(locale, "recurring_delete_confirm_cta")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
