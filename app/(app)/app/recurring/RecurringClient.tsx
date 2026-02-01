"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import { t } from "@/src/i18n/t";
import { toYmdUtc } from "@/src/utils/dateOnly";
import { RecurringFormModal } from "@/components/recurring/RecurringFormModal";
import { RecurringTable } from "@/components/recurring/RecurringTable";
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

const getTodayInput = () => toYmdUtc(new Date());

const getDayFromDateInput = (value: string) => Number(value.split("-")[2]) || 1;

export function RecurringClient({ locale, defaultCurrency }: { locale: Locale; defaultCurrency: string }) {
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(false);
  const [creatingMerchant, setCreatingMerchant] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recurringToDelete, setRecurringToDelete] = useState<Recurring | null>(null);
  const [dayOfMonthOverridden, setDayOfMonthOverridden] = useState(false);

  const resolvedDefaultCurrency = useMemo(() => {
    if (SUPPORTED_CURRENCIES.includes(defaultCurrency as (typeof SUPPORTED_CURRENCIES)[number])) {
      return defaultCurrency;
    }
    return "MXN";
  }, [defaultCurrency]);

  const [formState, setFormState] = useState<RecurringForm>(() => {
    const today = getTodayInput();
    return {
      name: "",
      amount: "",
      currency: resolvedDefaultCurrency,
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

  const createMerchant = useCallback(
    async (name: string) => {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) return null;
      setCreatingMerchant(true);
      try {
        const response = await postJSON<ApiItemResponse<Merchant>>("/api/merchants", {
          nameCustom: trimmedName,
        });
        setMerchants((current) => [response.data, ...current]);
        return response.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : t(locale, "recurring_generic_error");
        setToast(message);
        return null;
      } finally {
        setCreatingMerchant(false);
      }
    },
    [locale]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recurringResponse, categoryResponse, merchantsResponse] = await Promise.all([
        getJSON<ApiListResponse<Recurring>>(`/api/recurring?includeArchived=${showArchived}`),
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
  }, [locale, showArchived]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditing(null);
    const today = getTodayInput();
    setFormState({
      name: "",
      amount: "",
      currency: resolvedDefaultCurrency,
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
    if (
      formState.frequency === "monthly" &&
      dayOfMonthOverridden &&
      (!Number.isInteger(dayValue) || dayValue < 1 || dayValue > 31)
    ) {
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
        ...(formState.frequency === "monthly" && dayOfMonthOverridden
          ? { dayOfMonth: dayValue }
          : {}),
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
    const dayOfMonth = item.schedule.dayOfMonth ? String(item.schedule.dayOfMonth) : String(startDay);
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

  const handleFrequencyChange = (value: "monthly" | "weekly") => {
    setFormState((current) => {
      if (value === "monthly" && !dayOfMonthOverridden) {
        const startDay = getDayFromDateInput(current.startDate);
        return { ...current, frequency: value, dayOfMonth: String(startDay) };
      }
      return { ...current, frequency: value };
    });
  };

  const handleStartDateChange = (value: string) => {
    setFormState((current) => {
      if (current.frequency !== "monthly" || dayOfMonthOverridden) {
        return { ...current, startDate: value };
      }
      const startDay = getDayFromDateInput(value);
      return { ...current, startDate: value, dayOfMonth: String(startDay) };
    });
  };

  const handleOverrideChange = (value: boolean) => {
    setDayOfMonthOverridden(value);
    if (!value) {
      setFormState((current) => {
        const startDay = getDayFromDateInput(current.startDate);
        return { ...current, dayOfMonth: String(startDay) };
      });
    }
  };

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

      <RecurringFormModal
        open={modalOpen}
        title={editing ? t(locale, "recurring_edit") : t(locale, "recurring_add")}
        submitLabel={editing ? t(locale, "recurring_save") : t(locale, "recurring_add")}
        locale={locale}
        formState={formState}
        dayOfMonthOverridden={dayOfMonthOverridden}
        categories={categories}
        merchants={merchants}
        creatingMerchant={creatingMerchant}
        merchantsLoading={merchantsLoading}
        onClose={resetForm}
        onSubmit={handleSubmit}
        onFormChange={setFormState}
        onFrequencyChange={handleFrequencyChange}
        onIntervalChange={(value) => setFormState((current) => ({ ...current, interval: value }))}
        onDayOfMonthChange={(value) => {
          setDayOfMonthOverridden(true);
          setFormState((current) => ({ ...current, dayOfMonth: value }));
        }}
        onStartDateChange={handleStartDateChange}
        onOverrideChange={handleOverrideChange}
        onCreateMerchant={createMerchant}
        onLoadMerchants={() => void loadMerchants()}
      />

      {loading ? (
        <p className="text-sm opacity-60">{t(locale, "recurring_loading")}</p>
      ) : activeRecurring.length || (showArchived && archivedRecurring.length) ? (
        <div className="space-y-6">
          {activeRecurring.length ? (
            <RecurringTable
              items={activeRecurring}
              locale={locale}
              statusValue={t(locale, "recurring_status_active")}
              labels={{
                name: t(locale, "recurring_name"),
                amount: t(locale, "recurring_amount"),
                category: t(locale, "recurring_category"),
                merchant: t(locale, "recurring_merchant"),
                schedule: t(locale, "recurring_schedule"),
                nextRun: t(locale, "recurring_next_run"),
                status: t(locale, "recurring_status"),
                edit: t(locale, "recurring_edit"),
                archive: t(locale, "recurring_archive"),
                restore: t(locale, "recurring_restore"),
                delete: t(locale, "recurring_delete"),
              }}
              categoryMap={categoryMap}
              merchantMap={merchantMap}
              scheduleLabel={scheduleLabel}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onDelete={openDeleteModal}
            />
          ) : (
            <p className="text-sm opacity-60">{t(locale, "recurring_empty")}</p>
          )}
          {showArchived ? (
            archivedRecurring.length ? (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
                  {t(locale, "recurring_archived_section")}
                </h2>
                <RecurringTable
                  items={archivedRecurring}
                  locale={locale}
                  statusValue={t(locale, "recurring_status_archived")}
                  labels={{
                    name: t(locale, "recurring_name"),
                    amount: t(locale, "recurring_amount"),
                    category: t(locale, "recurring_category"),
                    merchant: t(locale, "recurring_merchant"),
                    schedule: t(locale, "recurring_schedule"),
                    nextRun: t(locale, "recurring_next_run"),
                    status: t(locale, "recurring_status"),
                    edit: t(locale, "recurring_edit"),
                    archive: t(locale, "recurring_archive"),
                    restore: t(locale, "recurring_restore"),
                    delete: t(locale, "recurring_delete"),
                  }}
                  categoryMap={categoryMap}
                  merchantMap={merchantMap}
                  scheduleLabel={scheduleLabel}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                  onDelete={openDeleteModal}
                />
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
