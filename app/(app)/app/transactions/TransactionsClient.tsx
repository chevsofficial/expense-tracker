"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import type { Locale } from "@/src/i18n/messages";

type TransactionKind = "income" | "expense";

type Transaction = {
  _id: string;
  date: string;
  amountMinor: number;
  currency: string;
  kind: TransactionKind;
  categoryId: string | null;
  note?: string;
  merchantId?: string | null;
  merchantNameSnapshot?: string | null;
  receiptUrls?: string[];
  isArchived?: boolean;
};

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  kind?: TransactionKind | "both";
  isArchived?: boolean;
};

type Merchant = {
  _id: string;
  name: string;
  isArchived?: boolean;
};

type ApiListResponse<T> = { data: T[] };

type ApiItemResponse<T> = { data: T };

type DeleteResponse = { data: { deleted: boolean } };

type TransactionForm = {
  date: string;
  amount: string;
  currency: string;
  kind: TransactionKind;
  categoryId: string;
  merchantId: string | null;
  merchantQuery: string;
  note: string;
  receiptUrls: string[];
};

type UploadOk = { data: { url: string } };
type UploadErr = { error: { message?: string } };

function isUploadOk(payload: unknown): payload is UploadOk {
  if (!payload || typeof payload !== "object") return false;

  const obj = payload as Record<string, unknown>;
  if (!("data" in obj)) return false;

  const data = obj.data;
  if (!data || typeof data !== "object") return false;

  const dataObj = data as Record<string, unknown>;
  return typeof dataObj.url === "string";
}

const getTodayInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentMonth = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

const formatDateInput = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getTodayInput();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function TransactionsClient({
  locale,
  defaultCurrency,
}: {
  locale: Locale;
  defaultCurrency: string;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantMatches, setMerchantMatches] = useState<Merchant[]>([]);
  const [merchantSearchLoading, setMerchantSearchLoading] = useState(false);
  const [month, setMonth] = useState(getCurrentMonth());
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const resolvedDefaultCurrency = useMemo(() => {
    if (SUPPORTED_CURRENCIES.includes(defaultCurrency as (typeof SUPPORTED_CURRENCIES)[number])) {
      return defaultCurrency;
    }
    return "MXN";
  }, [defaultCurrency]);

  const [formState, setFormState] = useState<TransactionForm>(() => ({
    date: getTodayInput(),
    amount: "",
    currency: resolvedDefaultCurrency,
    kind: "expense",
    categoryId: "uncategorized",
    merchantId: null,
    merchantQuery: "",
    note: "",
    receiptUrls: [],
  }));

  const categoryName = useCallback(
    (category?: Category | null) =>
      category?.nameCustom?.trim() || category?.nameKey || t(locale, "category_fallback_name"),
    [locale]
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(category._id, categoryName(category));
    });
    return map;
  }, [categories, categoryName]);

  const merchantMap = useMemo(() => {
    const map = new Map<string, string>();
    merchants.forEach((merchant) => {
      map.set(merchant._id, merchant.name);
    });
    return map;
  }, [merchants]);

  const formatCurrency = useCallback(
    (amountMinor: number, currency: string) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || resolvedDefaultCurrency,
      }).format(amountMinor / 100),
    [locale, resolvedDefaultCurrency]
  );

  const loadCategories = useCallback(async () => {
    try {
      const response = await getJSON<ApiListResponse<Category>>(
        "/api/categories?includeArchived=false"
      );
      setCategories(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    }
  }, [locale]);

  const loadMerchants = useCallback(async () => {
    try {
      const response = await getJSON<ApiListResponse<Merchant>>(
        "/api/merchants?includeArchived=true"
      );
      setMerchants(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    }
  }, [locale]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getJSON<ApiListResponse<Transaction>>(
        `/api/transactions?month=${month}&includeArchived=${showArchived}`
      );
      setTransactions(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [locale, month, showArchived]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadMerchants();
  }, [loadMerchants]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (!modalOpen) return;
    const query = formState.merchantQuery.trim();
    if (!query || formState.merchantId) {
      setMerchantMatches([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setMerchantSearchLoading(true);
      try {
        const response = await getJSON<ApiListResponse<Merchant>>(
          `/api/merchants?includeArchived=false&query=${encodeURIComponent(query)}`
        );
        setMerchantMatches(response.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t(locale, "transactions_generic_error");
        setToast(message);
      } finally {
        setMerchantSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [formState.merchantQuery, locale, modalOpen]);

  const openAddModal = () => {
    setEditingTransaction(null);
    setFormState({
      date: getTodayInput(),
      amount: "",
      currency: resolvedDefaultCurrency,
      kind: "expense",
      categoryId: "uncategorized",
      merchantId: null,
      merchantQuery: "",
      note: "",
      receiptUrls: [],
    });
    setModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormState({
      date: formatDateInput(transaction.date),
      amount: (transaction.amountMinor / 100).toFixed(2),
      currency: transaction.currency,
      kind: transaction.kind,
      categoryId: transaction.categoryId ?? "uncategorized",
      merchantId: transaction.merchantId ?? null,
      merchantQuery:
        (transaction.merchantId ? merchantMap.get(transaction.merchantId) : null) ??
        transaction.merchantNameSnapshot ??
        "",
      note: transaction.note ?? "",
      receiptUrls: transaction.receiptUrls ?? [],
    });
    setModalOpen(true);
  };

  const handleReceiptUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads", {
        method: "PUT",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok || !isUploadOk(payload)) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? ((payload as UploadErr).error?.message as string | undefined)
            : undefined;

        throw new Error(message ?? "Upload failed");
      }
      const url = payload.data.url;
      setFormState((current) => ({
        ...current,
        receiptUrls: [...current.receiptUrls, url],
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    } finally {
      setUploadingReceipt(false);
      event.target.value = "";
    }
  };

  const handleRemoveReceipt = (index: number) => {
    setFormState((current) => ({
      ...current,
      receiptUrls: current.receiptUrls.filter((_, idx) => idx !== index),
    }));
  };

  const handleSelectMerchant = (merchant: Merchant) => {
    setFormState((current) => ({
      ...current,
      merchantId: merchant._id,
      merchantQuery: merchant.name,
    }));
    setMerchantMatches([]);
  };

  const handleCreateMerchant = async () => {
    const query = formState.merchantQuery.trim();
    if (query.length < 2) return;
    setIsSubmitting(true);
    try {
      const response = await postJSON<ApiItemResponse<Merchant>>("/api/merchants", {
        name: query,
      });
      setFormState((current) => ({
        ...current,
        merchantId: response.data._id,
        merchantQuery: response.data.name,
      }));
      setMerchantMatches([response.data]);
      await loadMerchants();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number(formState.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setToast(t(locale, "transactions_amount_invalid"));
      return;
    }

    const trimmedMerchant = formState.merchantQuery.trim();
    if (trimmedMerchant && !formState.merchantId) {
      setToast(t(locale, "transactions_merchant_required"));
      return;
    }

    const payload: Record<string, unknown> = {
      date: formState.date,
      amount: amountValue,
      currency: formState.currency,
      kind: formState.kind,
      categoryId: formState.categoryId === "uncategorized" ? null : formState.categoryId,
      merchantId: formState.merchantId,
      merchantNameSnapshot: formState.merchantId ? trimmedMerchant : null,
    };

    if (formState.note.trim()) payload.note = formState.note.trim();
    payload.receiptUrls = formState.receiptUrls;

    setIsSubmitting(true);
    try {
      if (editingTransaction) {
        await putJSON<ApiItemResponse<Transaction>>(
          `/api/transactions/${editingTransaction._id}`,
          payload
        );
      } else {
        await postJSON<ApiItemResponse<Transaction>>("/api/transactions", payload);
      }
      setModalOpen(false);
      setEditingTransaction(null);
      await loadTransactions();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (transaction: Transaction) => {
    try {
      await delJSON<ApiItemResponse<Transaction>>(`/api/transactions/${transaction._id}`);
      await loadTransactions();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    }
  };

  const handleOpenDelete = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    setIsSubmitting(true);
    try {
      await delJSON<DeleteResponse>(`/api/transactions/${transactionToDelete._id}?hard=1`);
      setDeleteConfirmOpen(false);
      setTransactionToDelete(null);
      await loadTransactions();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedMonth = useMemo(() => {
    const [year, monthValue] = month.split("-");
    const date = new Date(Number(year), Number(monthValue) - 1, 1);
    if (Number.isNaN(date.getTime())) return month;
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
  }, [locale, month]);

  const resolveCategoryKind = useCallback(
    (category: Category): TransactionKind => (category.kind === "income" ? "income" : "expense"),
    []
  );

  const incomeCategories = useMemo(
    () =>
      categories.filter(
        (category) => resolveCategoryKind(category) === "income" && !category.isArchived
      ),
    [categories, resolveCategoryKind]
  );
  const expenseCategories = useMemo(
    () =>
      categories.filter(
        (category) => resolveCategoryKind(category) === "expense" && !category.isArchived
      ),
    [categories, resolveCategoryKind]
  );

  const activeTransactions = useMemo(
    () => transactions.filter((transaction) => !transaction.isArchived),
    [transactions]
  );
  const archivedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.isArchived),
    [transactions]
  );

  const handleRestore = async (transaction: Transaction) => {
    try {
      await putJSON<ApiItemResponse<Transaction>>(`/api/transactions/${transaction._id}`, {
        isArchived: false,
      });
      await loadTransactions();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    }
  };

  const renderTransactionsTable = (rows: Transaction[], variant: "active" | "archived") => (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>{t(locale, "transactions_date")}</th>
            <th>{t(locale, "transactions_merchant")}</th>
            <th>{t(locale, "transactions_note")}</th>
            <th>{t(locale, "transactions_category")}</th>
            <th>{t(locale, "transactions_kind")}</th>
            <th>{t(locale, "transactions_amount")}</th>
            <th>{t(locale, "transactions_actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-6 text-center text-sm opacity-70">
                {variant === "archived"
                  ? t(locale, "transactions_archived_empty")
                  : t(locale, "transactions_empty")}
              </td>
            </tr>
          ) : null}
          {rows.map((transaction) => {
            const date = new Date(transaction.date);
            const dateLabel = Number.isNaN(date.getTime())
              ? transaction.date
              : new Intl.DateTimeFormat(locale).format(date);
            const categoryLabel = transaction.categoryId
              ? categoryMap.get(transaction.categoryId) ?? t(locale, "transactions_uncategorized")
              : t(locale, "transactions_uncategorized");
            const kindLabel =
              transaction.kind === "income"
                ? t(locale, "category_kind_income")
                : t(locale, "category_kind_expense");
            const merchantLabel =
              (transaction.merchantId
                ? merchantMap.get(transaction.merchantId)
                : null) ??
              transaction.merchantNameSnapshot ??
              "-";

            return (
              <tr key={transaction._id}>
                <td>{dateLabel}</td>
                <td>{merchantLabel}</td>
                <td>{transaction.note ?? "-"}</td>
                <td>{categoryLabel}</td>
                <td>
                  <span className="badge badge-ghost">{kindLabel}</span>
                </td>
                <td>{formatCurrency(transaction.amountMinor, transaction.currency)}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    {variant === "active" ? (
                      <>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => openEditModal(transaction)}
                        >
                          {t(locale, "transactions_edit")}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleArchive(transaction)}
                          disabled={transaction.isArchived}
                        >
                          {t(locale, "transactions_archive")}
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleRestore(transaction)}
                      >
                        {t(locale, "transactions_restore")}
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => handleOpenDelete(transaction)}
                    >
                      {t(locale, "transactions_delete")}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "transactions_title")}</h1>
          <p className="mt-2 opacity-70">{formattedMonth}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span>{t(locale, "transactions_month")}</span>
            <input
              type="month"
              className="input input-bordered input-sm"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            {t(locale, "transactions_add")}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            {t(locale, "transactions_show_archived")}
          </label>
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

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          {loading ? <p className="text-sm opacity-70">{t(locale, "transactions_loading")}</p> : null}
          {showArchived ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold uppercase opacity-60">
                  {t(locale, "transactions_active_table")}
                </h2>
                {renderTransactionsTable(activeTransactions, "active")}
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase opacity-60">
                  {t(locale, "transactions_archived_table")}
                </h2>
                {renderTransactionsTable(archivedTransactions, "archived")}
              </div>
            </div>
          ) : (
            renderTransactionsTable(activeTransactions, "active")
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={t(locale, editingTransaction ? "transactions_edit" : "transactions_add")}
        onClose={() => setModalOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id="transaction-date"
              label={t(locale, "transactions_date")}
              type="date"
              value={formState.date}
              onChange={(event) => setFormState({ ...formState, date: event.target.value })}
            />
            <TextField
              id="transaction-amount"
              label={t(locale, "transactions_amount")}
              type="number"
              value={formState.amount}
              step="0.01"
              onChange={(event) => setFormState({ ...formState, amount: event.target.value })}
            />
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_currency")}
              </span>
              <select
                className="select select-bordered"
                value={formState.currency}
                onChange={(event) =>
                  setFormState({ ...formState, currency: event.target.value })
                }
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_kind")}
              </span>
              <select
                className="select select-bordered"
                value={formState.kind}
                onChange={(event) =>
                  setFormState({
                    ...formState,
                    kind: event.target.value as TransactionKind,
                  })
                }
              >
                <option value="expense">{t(locale, "category_kind_expense")}</option>
                <option value="income">{t(locale, "category_kind_income")}</option>
              </select>
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_category")}
              </span>
              <select
                className="select select-bordered"
                value={formState.categoryId}
                onChange={(event) =>
                  setFormState({ ...formState, categoryId: event.target.value })
                }
              >
                <option value="uncategorized">{t(locale, "transactions_uncategorized")}</option>
                <optgroup label={t(locale, "category_kind_income")}>
                  {incomeCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {categoryName(category)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t(locale, "category_kind_expense")}>
                  {expenseCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {categoryName(category)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <div className="relative">
              <TextField
                id="transaction-merchant"
                label={t(locale, "transactions_merchant")}
                value={formState.merchantQuery}
                placeholder={t(locale, "transactions_merchant_placeholder")}
                onChange={(event) =>
                  setFormState({
                    ...formState,
                    merchantQuery: event.target.value,
                    merchantId: null,
                  })
                }
              />
              {formState.merchantQuery.trim() && !formState.merchantId ? (
                <div className="absolute z-10 mt-1 w-full rounded-box border border-base-300 bg-base-100 shadow">
                  {merchantSearchLoading ? (
                    <div className="px-3 py-2 text-sm opacity-60">
                      {t(locale, "merchants_loading")}
                    </div>
                  ) : merchantMatches.length ? (
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {merchantMatches.map((merchant) => (
                        <li key={merchant._id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-base-200"
                            onClick={() => handleSelectMerchant(merchant)}
                          >
                            {merchant.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-2 px-3 py-2 text-sm">
                      <p className="opacity-60">{t(locale, "transactions_no_merchants")}</p>
                      {formState.merchantQuery.trim().length >= 2 ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={handleCreateMerchant}
                          disabled={isSubmitting}
                        >
                          {t(locale, "transactions_create_merchant")} “
                          {formState.merchantQuery.trim()}”
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <label className="form-control w-full md:col-span-2">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_note")}
              </span>
              <textarea
                className="textarea textarea-bordered"
                value={formState.note}
                onChange={(event) => setFormState({ ...formState, note: event.target.value })}
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t(locale, "transactions_receipts")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="file-input file-input-bordered w-full"
                type="file"
                onChange={handleReceiptUpload}
                disabled={uploadingReceipt}
              />
              {uploadingReceipt ? (
                <span className="text-xs opacity-60">{t(locale, "transactions_uploading")}</span>
              ) : null}
            </div>
            {formState.receiptUrls.length ? (
              <ul className="space-y-2">
                {formState.receiptUrls.map((url, index) => (
                  <li key={`${url}-${index}`} className="flex items-center justify-between gap-2">
                    <a
                      className="text-sm break-all link link-hover"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {url}
                    </a>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleRemoveReceipt(index)}
                    >
                      {t(locale, "transactions_remove_receipt")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-60">{t(locale, "transactions_receipts_empty")}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" type="button" onClick={() => setModalOpen(false)}>
              {t(locale, "transactions_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting}>
              {editingTransaction
                ? t(locale, "transactions_save")
                : t(locale, "transactions_add")}
            </SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteConfirmOpen}
        title={t(locale, "transactions_delete")}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-80">{t(locale, "transactions_delete_warning")}</p>
          <div className="flex justify-end gap-2">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              {t(locale, "transactions_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleDelete} type="button">
              {t(locale, "transactions_delete_confirm")}
            </SubmitButton>
          </div>
        </div>
      </Modal>
    </section>
  );
}
