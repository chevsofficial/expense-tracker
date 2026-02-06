"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { CategoryPicker } from "@/components/pickers/CategoryPicker";
import { MerchantPicker } from "@/components/pickers/MerchantPicker";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import { formatMonthLabel } from "@/src/utils/month";
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
  accountId?: string | null;
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

type Account = {
  _id: string;
  name: string;
  type?: string | null;
  currency?: string | null;
  isArchived?: boolean;
};

type ApiListResponse<T> = { data: T[] };

type ApiItemResponse<T> = { data: T };

type TransactionsResponse = { data: { items: Transaction[] } };

type DeleteResponse = { data: { deleted: boolean } };

type TransactionForm = {
  date: string;
  amount: string;
  currency: string;
  kind: TransactionKind;
  accountId: string;
  categoryId: string;
  merchantId: string | null;
  merchantNameSnapshot: string;
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getTodayInput();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function TransactionsClient({
  locale,
  defaultCurrency,
}: {
  locale: Locale;
  defaultCurrency: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initializedFromQuery = useRef(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(false);
  const [creatingMerchant, setCreatingMerchant] = useState(false);
  const [month, setMonth] = useState(getCurrentMonth());
  const [kindFilter, setKindFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [merchantFilter, setMerchantFilter] = useState<string>("");
  const [accountFilter, setAccountFilter] = useState<string>("");
  const [currencyFilter, setCurrencyFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

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
    accountId: "unassigned",
    categoryId: "uncategorized",
    merchantId: null,
    merchantNameSnapshot: "",
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

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((account) => {
      map.set(account._id, account.name);
    });
    return map;
  }, [accounts]);

  const defaultAccountId = useMemo(
    () => accounts.find((account) => !account.isArchived)?._id ?? "unassigned",
    [accounts]
  );

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
    setMerchantsLoading(true);
    try {
      const response = await getJSON<ApiListResponse<Merchant>>(
        `/api/merchants?includeArchived=${showArchived}`
      );
      setMerchants(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    } finally {
      setMerchantsLoading(false);
    }
  }, [locale, showArchived]);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await getJSON<ApiListResponse<Account>>(
        "/api/accounts?includeArchived=true"
      );
      setAccounts(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    }
  }, [locale]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (month) params.set("month", month);
      if (kindFilter) params.set("kind", kindFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (merchantFilter) params.set("merchantId", merchantFilter);
      if (accountFilter) params.set("accountId", accountFilter);
      if (currencyFilter) params.set("currency", currencyFilter);
      if (searchFilter) params.set("q", searchFilter);
      params.set("includeArchived", String(showArchived));

      const response = await getJSON<TransactionsResponse>(`/api/transactions?${params}`);
      setTransactions(response.data.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [
    locale,
    month,
    showArchived,
    kindFilter,
    categoryFilter,
    merchantFilter,
    accountFilter,
    currencyFilter,
    searchFilter,
  ]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadMerchants();
  }, [loadMerchants]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (initializedFromQuery.current) return;
    const paramMonth = searchParams.get("month");
    const paramKind = searchParams.get("kind");
    const paramCategory = searchParams.get("categoryId");
    const paramMerchant = searchParams.get("merchantId");
    const paramAccount = searchParams.get("accountId");
    const paramCurrency = searchParams.get("currency");
    const paramQuery = searchParams.get("q");
    const paramArchived = searchParams.get("includeArchived");

    if (paramMonth) setMonth(paramMonth);
    if (paramKind) setKindFilter(paramKind);
    if (paramCategory) setCategoryFilter(paramCategory);
    if (paramMerchant) setMerchantFilter(paramMerchant);
    if (paramAccount) setAccountFilter(paramAccount);
    if (paramCurrency) setCurrencyFilter(paramCurrency);
    if (paramQuery) setSearchFilter(paramQuery);
    if (paramArchived) setShowArchived(paramArchived === "true");

    initializedFromQuery.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initializedFromQuery.current) return;
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (kindFilter) params.set("kind", kindFilter);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    if (merchantFilter) params.set("merchantId", merchantFilter);
    if (accountFilter) params.set("accountId", accountFilter);
    if (currencyFilter) params.set("currency", currencyFilter);
    if (searchFilter) params.set("q", searchFilter);
    params.set("includeArchived", String(showArchived));
    router.replace(`/app/transactions?${params.toString()}`);
  }, [
    month,
    kindFilter,
    categoryFilter,
    merchantFilter,
    accountFilter,
    currencyFilter,
    searchFilter,
    showArchived,
    router,
  ]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const openAddModal = () => {
    setEditingTransaction(null);
    setFormState({
      date: getTodayInput(),
      amount: "",
      currency: resolvedDefaultCurrency,
      kind: "expense",
      accountId: defaultAccountId,
      categoryId: "uncategorized",
      merchantId: null,
      merchantNameSnapshot: "",
      note: "",
      receiptUrls: [],
    });
    setModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    const merchantName =
      (transaction.merchantId ? merchantMap.get(transaction.merchantId) : null) ??
      transaction.merchantNameSnapshot ??
      "";
    setEditingTransaction(transaction);
    setFormState({
      date: formatDateInput(transaction.date),
      amount: (transaction.amountMinor / 100).toFixed(2),
      currency: transaction.currency,
      kind: transaction.kind,
      accountId: transaction.accountId ?? "unassigned",
      categoryId: transaction.categoryId ?? "uncategorized",
      merchantId: transaction.merchantId ?? null,
      merchantNameSnapshot: merchantName,
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
        const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
        setToast(message);
        return null;
      } finally {
        setCreatingMerchant(false);
      }
    },
    [locale]
  );

  const handleFormMerchantChange = (merchantId: string) => {
    const merchant = merchants.find((item) => item._id === merchantId);
    setFormState((current) => ({
      ...current,
      merchantId: merchantId || null,
      merchantNameSnapshot: merchant?.name ?? "",
    }));
  };

  const handleFormCategoryChange = (categoryId: string) => {
    setFormState((current) => ({
      ...current,
      categoryId: categoryId || "uncategorized",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number(formState.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setToast(t(locale, "transactions_amount_invalid"));
      return;
    }

    const trimmedMerchantName = formState.merchantNameSnapshot.trim();

    const payload: Record<string, unknown> = {
      date: formState.date,
      amount: amountValue,
      currency: formState.currency,
      kind: formState.kind,
      accountId: formState.accountId === "unassigned" ? null : formState.accountId,
      categoryId: formState.categoryId === "uncategorized" ? null : formState.categoryId,
      merchantId: formState.merchantId,
      merchantNameSnapshot: formState.merchantId ? trimmedMerchantName || null : null,
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

  const formattedMonth = useMemo(() => formatMonthLabel(month, locale), [locale, month]);

  const activeTransactions = useMemo(
    () => transactions.filter((transaction) => !transaction.isArchived),
    [transactions]
  );
  const archivedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.isArchived),
    [transactions]
  );

  const selectedTransactions = useMemo(
    () => transactions.filter((transaction) => selectedIds.has(transaction._id)),
    [transactions, selectedIds]
  );

  const toggleSelectAll = (rows: Transaction[], checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      rows.forEach((row) => {
        if (checked) {
          next.add(row._id);
        } else {
          next.delete(row._id);
        }
      });
      return next;
    });
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleBulkAction = async (action: "archive" | "restore" | "deleteHard") => {
    const targetIds = selectedTransactions
      .filter((transaction) => {
        if (action === "archive") return !transaction.isArchived;
        if (action === "restore") return Boolean(transaction.isArchived);
        return true;
      })
      .map((transaction) => transaction._id);

    if (!targetIds.length) return;
    setBulkSubmitting(true);
    try {
      await postJSON<{ data: { updated?: number; deleted?: number } }>("/api/transactions/bulk", {
        ids: targetIds,
        action,
      });
      setSelectedIds(new Set());
      await loadTransactions();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "transactions_generic_error");
      setToast(message);
    } finally {
      setBulkSubmitting(false);
    }
  };

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
        <thead className="bg-base-200 text-base-content">
          <tr>
            <th>
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={rows.length > 0 && rows.every((row) => selectedIds.has(row._id))}
                onChange={(event) => toggleSelectAll(rows, event.target.checked)}
              />
            </th>
            <th>{t(locale, "transactions_date")}</th>
            <th>{t(locale, "transactions_merchant")}</th>
            <th>{t(locale, "transactions_note")}</th>
            <th>{t(locale, "transactions_category")}</th>
            <th>{t(locale, "transactions_account")}</th>
            <th>{t(locale, "transactions_kind")}</th>
            <th>{t(locale, "transactions_amount")}</th>
            <th>{t(locale, "transactions_receipt")}</th>
            <th>{t(locale, "transactions_actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-6 text-center text-sm opacity-70">
                {variant === "archived"
                  ? t(locale, "transactions_archived_empty")
                  : t(locale, "transactions_empty")}
              </td>
            </tr>
          ) : null}
          {rows.map((transaction) => {
            const dateObj = new Date(transaction.date);
            const dateLabel = Number.isNaN(dateObj.getTime())
              ? transaction.date
              : new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(dateObj);
            const categoryLabel = transaction.categoryId
              ? categoryMap.get(transaction.categoryId) ?? t(locale, "transactions_uncategorized")
              : t(locale, "transactions_uncategorized");
            const accountLabel = transaction.accountId
              ? accountMap.get(transaction.accountId) ?? t(locale, "transactions_account_unassigned")
              : t(locale, "transactions_account_unassigned");
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
            const receiptUrl = transaction.receiptUrls?.[0];

            return (
              <tr key={transaction._id}>
                <td>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedIds.has(transaction._id)}
                    onChange={(event) => toggleSelectOne(transaction._id, event.target.checked)}
                  />
                </td>
                <td>{dateLabel}</td>
                <td>{merchantLabel}</td>
                <td>{transaction.note ?? "-"}</td>
                <td>{categoryLabel}</td>
                <td>{accountLabel}</td>
                <td>
                  <span className="badge badge-ghost">{kindLabel}</span>
                </td>
                <td>{formatCurrency(transaction.amountMinor, transaction.currency)}</td>
                <td>
                  {receiptUrl ? (
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        setReceiptPreviewUrl(receiptUrl);
                        setReceiptPreviewOpen(true);
                      }}
                    >
                      {t(locale, "transactions_receipt_view")}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
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
          <h1 className="text-3xl font-bold text-neutral">{t(locale, "transactions_title")}</h1>
          <p className="mt-2 opacity-70">{formattedMonth}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            {t(locale, "transactions_add")}
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

      <div className="card bg-base-100 shadow">
        <div className="card-body space-y-6">
          <div className="grid gap-4 lg:grid-cols-8">
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_month")}
              </span>
              <input
                type="month"
                className="input input-bordered input-sm"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
              <div className="mt-1 text-xs opacity-60">{formattedMonth}</div>
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_kind")}
              </span>
              <select
                className="select select-bordered select-sm"
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value)}
              >
                <option value="">{t(locale, "transactions_filter_any")}</option>
                <option value="expense">{t(locale, "category_kind_expense")}</option>
                <option value="income">{t(locale, "category_kind_income")}</option>
              </select>
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_category")}
              </span>
              <CategoryPicker
                locale={locale}
                categories={categories}
                value={categoryFilter}
                onChange={setCategoryFilter}
                allowEmpty
                emptyLabel={t(locale, "transactions_filter_any")}
                placeholder={t(locale, "transactions_filter_any")}
                showManageLink
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_merchant")}
              </span>
              <MerchantPicker
                locale={locale}
                merchants={merchants}
                value={merchantFilter}
                onChange={setMerchantFilter}
                placeholder={t(locale, "transactions_filter_any")}
                allowEmpty
                emptyLabel={t(locale, "transactions_filter_any")}
                allowCreate
                creating={creatingMerchant}
                onCreateMerchant={createMerchant}
                onLoadMerchants={() => void loadMerchants()}
                loading={merchantsLoading}
                showManageLink
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_account")}
              </span>
              <select
                className="select select-bordered select-sm"
                value={accountFilter}
                onChange={(event) => setAccountFilter(event.target.value)}
              >
                <option value="">{t(locale, "transactions_filter_any")}</option>
                {accounts
                  .filter((account) => !account.isArchived)
                  .map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_currency")}
              </span>
              <select
                className="select select-bordered select-sm"
                value={currencyFilter}
                onChange={(event) => setCurrencyFilter(event.target.value)}
              >
                <option value="">{t(locale, "transactions_filter_any")}</option>
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control w-full lg:col-span-2">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_search")}
              </span>
              <input
                type="text"
                className="input input-bordered input-sm"
                value={searchFilter}
                onChange={(event) => setSearchFilter(event.target.value)}
                placeholder={t(locale, "transactions_search_placeholder")}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
      </div>

      {selectedTransactions.length ? (
        <div className="alert flex flex-wrap items-center justify-between gap-3">
          <span>
            {selectedTransactions.length} {t(locale, "transactions_bulk_selected")}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handleBulkAction("archive")}
              disabled={bulkSubmitting}
            >
              {t(locale, "transactions_archive")}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handleBulkAction("restore")}
              disabled={bulkSubmitting}
            >
              {t(locale, "transactions_restore")}
            </button>
            <button
              className="btn btn-ghost btn-sm text-error"
              onClick={() => handleBulkAction("deleteHard")}
              disabled={bulkSubmitting}
            >
              {t(locale, "transactions_delete")}
            </button>
          </div>
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
                onChange={(event) => {
                  setFormState({
                    ...formState,
                    kind: event.target.value as TransactionKind,
                  });
                }}
              >
                <option value="expense">{t(locale, "category_kind_expense")}</option>
                <option value="income">{t(locale, "category_kind_income")}</option>
              </select>
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_account")}
              </span>
              <select
                className="select select-bordered"
                value={formState.accountId}
                onChange={(event) =>
                  setFormState({
                    ...formState,
                    accountId: event.target.value,
                  })
                }
              >
                <option value="unassigned">{t(locale, "transactions_account_unassigned")}</option>
                {accounts
                  .filter((account) => !account.isArchived)
                  .map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_category")}
              </span>
              <CategoryPicker
                locale={locale}
                categories={categories}
                value={formState.categoryId === "uncategorized" ? "" : formState.categoryId}
                onChange={handleFormCategoryChange}
                allowEmpty
                emptyLabel={t(locale, "transactions_category_uncategorized")}
                placeholder={t(locale, "transactions_category_search_placeholder")}
                showManageLink
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "transactions_merchant")}
              </span>
              <MerchantPicker
                locale={locale}
                merchants={merchants}
                value={formState.merchantId ?? ""}
                onChange={handleFormMerchantChange}
                placeholder={t(locale, "transactions_merchant_placeholder")}
                allowCreate
                creating={creatingMerchant}
                onCreateMerchant={createMerchant}
                onLoadMerchants={() => void loadMerchants()}
                loading={merchantsLoading}
                showManageLink
              />
            </label>
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

      <Modal
        open={receiptPreviewOpen}
        title={t(locale, "transactions_receipt")}
        onClose={() => setReceiptPreviewOpen(false)}
      >
        <div className="space-y-4">
          {receiptPreviewUrl ? (
            <>
              <div className="relative h-[60vh] w-full">
                <Image
                  src={receiptPreviewUrl}
                  alt={t(locale, "transactions_receipt")}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="rounded border object-contain"
                />
              </div>
              <a
                className="link link-primary"
                href={receiptPreviewUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t(locale, "transactions_receipt_open")}
              </a>
            </>
          ) : (
            <p className="text-sm opacity-70">{t(locale, "transactions_receipt_missing")}</p>
          )}
        </div>
      </Modal>
    </section>
  );
}
