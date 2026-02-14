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
import { PageHeader } from "@/components/ui/PageHeader";
import { SurfaceCard, SurfaceCardBody } from "@/components/ui/SurfaceCard";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { CategoryPicker } from "@/components/pickers/CategoryPicker";
import { MerchantPicker } from "@/components/pickers/MerchantPicker";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { formatRangeLabel, getPresetRange } from "@/src/utils/dateRange";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import type { Category } from "@/src/types/category";
import { getWorkspaceCurrency } from "@/src/lib/currency";

type TransactionKind = "income" | "expense";

type Transaction = {
  _id: string;
  date: string;
  amountMinor: number;
  kind: TransactionKind;
  accountId?: string | null;
  categoryId: string | null;
  note?: string;
  merchantId?: string | null;
  merchantNameSnapshot?: string | null;
  receiptUrls?: string[];
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
  isArchived?: boolean;
};

type ApiListResponse<T> = { data: T[] };

type ApiItemResponse<T> = { data: T };

type TransactionsResponse = { data: { items: Transaction[] } };

type DeleteResponse = { data: { deleted: boolean } };

type TransactionForm = {
  date: string;
  amount: string;
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


const formatDateInput = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getTodayInput();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const kindFromCategory = (
  categoryId: string | null,
  categories: Category[]
): TransactionKind | null => {
  if (!categoryId) return null;
  const category = categories.find((item) => item._id === categoryId);
  if (!category) return null;
  if (category.kind === "income" || category.kind === "expense") {
    return category.kind;
  }
  return "expense";
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
  const [dateRange, setDateRange] = useState(() => getPresetRange("thisMonth"));
  const [kindFilter, setKindFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [merchantFilter, setMerchantFilter] = useState<string>("");
  const [accountFilter, setAccountFilter] = useState<string>("");
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


  const resolvedDefaultCurrency = useMemo(
    () => getWorkspaceCurrency({ defaultCurrency }),
    [defaultCurrency]
  );

  const [formState, setFormState] = useState<TransactionForm>(() => ({
    date: getTodayInput(),
    amount: "",
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

  const selectableCategories = useMemo(
    () => categories.filter((category) => !category.isArchived),
    [categories]
  );

  const selectedCategoryKind = useMemo(
    () =>
      kindFromCategory(
        formState.categoryId === "uncategorized" ? null : formState.categoryId,
        selectableCategories
      ),
    [formState.categoryId, selectableCategories]
  );

  const isKindLocked = Boolean(selectedCategoryKind);

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
    (amountMinor: number) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: resolvedDefaultCurrency,
      }).format(amountMinor / 100),
    [locale, resolvedDefaultCurrency]
  );

  const loadCategories = useCallback(async () => {
    try {
      const categoriesResponse = await getJSON<ApiListResponse<Category>>(
        "/api/categories?includeArchived=false"
      );
      setCategories(categoriesResponse.data);
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
      if (dateRange.start) params.set("startDate", dateRange.start);
      if (dateRange.end) params.set("endDate", dateRange.end);
      if (kindFilter) params.set("kind", kindFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (merchantFilter) params.set("merchantId", merchantFilter);
      if (accountFilter) params.set("accountId", accountFilter);
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
    dateRange.end,
    dateRange.start,
    showArchived,
    kindFilter,
    categoryFilter,
    merchantFilter,
    accountFilter,
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
    const paramStartDate = searchParams.get("startDate");
    const paramEndDate = searchParams.get("endDate");
    const paramKind = searchParams.get("kind");
    const paramCategory = searchParams.get("categoryId");
    const paramMerchant = searchParams.get("merchantId");
    const paramAccount = searchParams.get("accountId");
    const paramQuery = searchParams.get("q");
    const paramArchived = searchParams.get("includeArchived");

    if (paramStartDate || paramEndDate) {
      setDateRange({
        start: paramStartDate || null,
        end: paramEndDate || null,
      });
    } else if (paramMonth && /^\d{4}-\d{2}$/.test(paramMonth)) {
      const [yearRaw, monthRaw] = paramMonth.split("-");
      const year = Number(yearRaw);
      const monthIndex = Number(monthRaw) - 1;
      const start = new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10);
      setDateRange({ start, end });
    }
    if (paramKind) setKindFilter(paramKind);
    if (paramCategory) setCategoryFilter(paramCategory);
    if (paramMerchant) setMerchantFilter(paramMerchant);
    if (paramAccount) setAccountFilter(paramAccount);
    if (paramQuery) setSearchFilter(paramQuery);
    if (paramArchived) setShowArchived(paramArchived === "true");

    initializedFromQuery.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initializedFromQuery.current) return;
    const params = new URLSearchParams();
    if (dateRange.start) params.set("startDate", dateRange.start);
    if (dateRange.end) params.set("endDate", dateRange.end);
    if (kindFilter) params.set("kind", kindFilter);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    if (merchantFilter) params.set("merchantId", merchantFilter);
    if (accountFilter) params.set("accountId", accountFilter);
    if (searchFilter) params.set("q", searchFilter);
    params.set("includeArchived", String(showArchived));
    router.replace(`/app/transactions?${params.toString()}`);
  }, [
    dateRange.end,
    dateRange.start,
    kindFilter,
    categoryFilter,
    merchantFilter,
    accountFilter,
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
    setFormState((current) => {
      const normalizedCategoryId = categoryId || "uncategorized";
      const forcedKind = kindFromCategory(
        normalizedCategoryId === "uncategorized" ? null : normalizedCategoryId,
        selectableCategories
      );
      return {
        ...current,
        categoryId: normalizedCategoryId,
        kind: forcedKind ?? current.kind,
      };
    });
  };


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number(formState.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setToast(t(locale, "transactions_amount_invalid"));
      return;
    }

    const trimmedMerchantName = formState.merchantNameSnapshot.trim();

    const forcedKind = kindFromCategory(
      formState.categoryId === "uncategorized" ? null : formState.categoryId,
      selectableCategories
    );

    const payload: Record<string, unknown> = {
      date: formState.date,
      amount: amountValue,
      kind: forcedKind ?? formState.kind,
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

  const formattedDateRange = useMemo(() => formatRangeLabel(dateRange, locale), [dateRange, locale]);

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
                <td>{formatCurrency(transaction.amountMinor)}</td>
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
        <PageHeader title={t(locale, "transactions_title")} subtitle={formattedDateRange} />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="opacity-70">{t(locale, "transactions_show_archived")}</span>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
          </label>
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

      <SurfaceCard>
        <SurfaceCardBody className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <DateRangePicker locale={locale} value={dateRange} onChange={setDateRange} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-8">
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
                  categories={selectableCategories}
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
              
              <label className="form-control w-full md:col-span-2 lg:col-span-2">
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
          </div>
        </SurfaceCardBody>
      </SurfaceCard>

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

      <SurfaceCard>
        <SurfaceCardBody className="p-0">
          <div className="space-y-6 p-4 md:p-5">
            {loading ? (
              <p className="text-sm opacity-70">{t(locale, "transactions_loading")}</p>
            ) : null}
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
        </SurfaceCardBody>
      </SurfaceCard>

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
                {t(locale, "transactions_kind")}
              </span>
              {isKindLocked ? (
                <div className="badge badge-outline h-10 w-fit px-4 text-sm font-medium">
                  {selectedCategoryKind === "income"
                    ? t(locale, "category_kind_income")
                    : t(locale, "category_kind_expense")}
                </div>
              ) : (
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
              )}
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
                categories={selectableCategories}
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
