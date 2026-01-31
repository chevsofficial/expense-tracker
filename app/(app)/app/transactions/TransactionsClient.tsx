"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
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
  merchant?: string;
  receipts?: Receipt[];
  isArchived?: boolean;
};

type Receipt = {
  url: string;
  name?: string;
  uploadedAt: string;
};

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
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
  merchant: string;
  note: string;
  receipts: Receipt[];
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

  const [formState, setFormState] = useState<TransactionForm>(() => ({
    date: getTodayInput(),
    amount: "",
    currency: defaultCurrency,
    kind: "expense",
    categoryId: "uncategorized",
    merchant: "",
    note: "",
    receipts: [],
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

  const formatCurrency = useCallback(
    (amountMinor: number, currency: string) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || defaultCurrency,
      }).format(amountMinor / 100),
    [defaultCurrency, locale]
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
    void loadTransactions();
  }, [loadTransactions]);

  const openAddModal = () => {
    setEditingTransaction(null);
    setFormState({
      date: getTodayInput(),
      amount: "",
      currency: defaultCurrency,
      kind: "expense",
      categoryId: "uncategorized",
      merchant: "",
      note: "",
      receipts: [],
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
      merchant: transaction.merchant ?? "",
      note: transaction.note ?? "",
      receipts: transaction.receipts ?? [],
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
      const response = await fetch("/api/uploads/receipt", {
        method: "POST",
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
        receipts: [
          ...current.receipts,
          { url, name: file.name, uploadedAt: new Date().toISOString() },
        ],
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
      receipts: current.receipts.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number(formState.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setToast(t(locale, "transactions_amount_invalid"));
      return;
    }

    const payload: Record<string, unknown> = {
      date: formState.date,
      amount: amountValue,
      currency: formState.currency.trim(),
      kind: formState.kind,
      categoryId: formState.categoryId === "uncategorized" ? null : formState.categoryId,
    };

    if (formState.merchant.trim()) payload.merchant = formState.merchant.trim();
    if (formState.note.trim()) payload.note = formState.note.trim();
    if (formState.receipts.length) payload.receipts = formState.receipts;

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
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm opacity-70">
                      {t(locale, "transactions_empty")}
                    </td>
                  </tr>
                ) : null}
                {transactions.map((transaction) => {
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

                  return (
                    <tr key={transaction._id}>
                      <td>{dateLabel}</td>
                      <td>{transaction.merchant ?? "-"}</td>
                      <td>{transaction.note ?? "-"}</td>
                      <td>{categoryLabel}</td>
                      <td>
                        <span className="badge badge-ghost">{kindLabel}</span>
                      </td>
                      <td>{formatCurrency(transaction.amountMinor, transaction.currency)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
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
            <TextField
              id="transaction-currency"
              label={t(locale, "transactions_currency")}
              value={formState.currency}
              onChange={(event) => setFormState({ ...formState, currency: event.target.value })}
            />
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
                {categories
                  .filter((category) => !category.isArchived)
                  .map((category) => (
                    <option key={category._id} value={category._id}>
                      {categoryName(category)}
                    </option>
                  ))}
              </select>
            </label>
            <TextField
              id="transaction-merchant"
              label={t(locale, "transactions_merchant")}
              value={formState.merchant}
              onChange={(event) => setFormState({ ...formState, merchant: event.target.value })}
            />
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
            {formState.receipts.length ? (
              <ul className="space-y-2">
                {formState.receipts.map((receipt, index) => (
                  <li
                    key={`${receipt.url}-${index}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <a
                      className="text-sm break-all link link-hover"
                      href={receipt.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {receipt.name ?? receipt.url}
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
