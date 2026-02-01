"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type Merchant = {
  _id: string;
  name: string;
  defaultCategoryId?: string | null;
  defaultKind?: "income" | "expense" | null;
  aliases?: string[];
  isArchived?: boolean;
};

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
};

type ApiListResponse<T> = { data: T[] };
type ApiItemResponse<T> = { data: T };
type DeleteResponse = { data: { deleted: boolean } };

export function MerchantsClient({ locale }: { locale: Locale }) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [editName, setEditName] = useState("");
  const [editDefaultCategoryId, setEditDefaultCategoryId] = useState<string>("");
  const [editDefaultKind, setEditDefaultKind] = useState<string>("");
  const [editAliases, setEditAliases] = useState("");

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [merchantToArchive, setMerchantToArchive] = useState<Merchant | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [merchantToDelete, setMerchantToDelete] = useState<Merchant | null>(null);

  const activeMerchants = useMemo(
    () => merchants.filter((merchant) => !merchant.isArchived),
    [merchants]
  );
  const archivedMerchants = useMemo(
    () => merchants.filter((merchant) => merchant.isArchived),
    [merchants]
  );

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

  const normalizeAliases = (value: string) =>
    Array.from(
      new Set(
        value
          .split(/[,|\n]/)
          .map((alias) => alias.trim().toLowerCase())
          .filter((alias) => alias.length > 0)
      )
    );

  const loadMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getJSON<ApiListResponse<Merchant>>(
        "/api/merchants?includeArchived=true"
      );
      setMerchants(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "merchants_generic_error");
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await getJSON<ApiListResponse<Category>>(
        "/api/categories?includeArchived=true"
      );
      setCategories(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "merchants_generic_error");
      setToast(message);
    }
  }, [locale]);

  useEffect(() => {
    void loadMerchants();
  }, [loadMerchants]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const openAdd = () => {
    setEditingMerchant(null);
    setEditName("");
    setEditDefaultCategoryId("");
    setEditDefaultKind("");
    setEditAliases("");
    setEditOpen(true);
  };

  const openEdit = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setEditName(merchant.name);
    setEditDefaultCategoryId(merchant.defaultCategoryId ?? "");
    setEditDefaultKind(merchant.defaultKind ?? "");
    setEditAliases((merchant.aliases ?? []).join(", "));
    setEditOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editName.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        nameCustom: editName.trim(),
        defaultCategoryId: editDefaultCategoryId || null,
        defaultKind: editDefaultKind ? (editDefaultKind as "income" | "expense") : null,
        aliases: normalizeAliases(editAliases),
      };
      if (editingMerchant) {
        await putJSON<ApiItemResponse<Merchant>>(`/api/merchants/${editingMerchant._id}`, payload);
      } else {
        await postJSON<ApiItemResponse<Merchant>>("/api/merchants", payload);
      }
      setEditOpen(false);
      setEditingMerchant(null);
      await loadMerchants();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "merchants_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!merchantToArchive) return;
    setIsSubmitting(true);
    try {
      await delJSON<ApiItemResponse<Merchant>>(`/api/merchants/${merchantToArchive._id}`);
      setArchiveOpen(false);
      setMerchantToArchive(null);
      await loadMerchants();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "merchants_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!merchantToDelete) return;
    setIsSubmitting(true);
    try {
      await delJSON<DeleteResponse>(`/api/merchants/${merchantToDelete._id}?hard=1`);
      setDeleteOpen(false);
      setMerchantToDelete(null);
      await loadMerchants();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "merchants_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async (merchant: Merchant) => {
    setIsSubmitting(true);
    try {
      await putJSON<ApiItemResponse<Merchant>>(`/api/merchants/${merchant._id}`, {
        isArchived: false,
      });
      await loadMerchants();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "merchants_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t(locale, "merchants_title")}</h1>
          <p className="text-sm opacity-70">{t(locale, "merchants_subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            {t(locale, "merchants_add")}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            {t(locale, "merchants_show_archived")}
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
        <div className="card-body space-y-6">
          {loading ? <p className="text-sm opacity-70">{t(locale, "merchants_loading")}</p> : null}
          <div>
            <h2 className="text-sm font-semibold uppercase opacity-60">
              {t(locale, "merchants_active")}
            </h2>
            {activeMerchants.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t(locale, "merchants_name")}</th>
                      <th>{t(locale, "merchants_default_category")}</th>
                      <th>{t(locale, "merchants_default_kind")}</th>
                      <th>{t(locale, "merchants_aliases")}</th>
                      <th>{t(locale, "merchants_actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMerchants.map((merchant) => (
                      <tr key={merchant._id}>
                        <td>{merchant.name}</td>
                        <td>
                          {merchant.defaultCategoryId
                            ? categoryMap.get(merchant.defaultCategoryId) ?? "—"
                            : "—"}
                        </td>
                        <td>
                          {merchant.defaultKind
                            ? t(
                                locale,
                                merchant.defaultKind === "income"
                                  ? "category_kind_income"
                                  : "category_kind_expense"
                              )
                            : "—"}
                        </td>
                        <td>
                          {merchant.aliases?.length ? merchant.aliases.join(", ") : "—"}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => openEdit(merchant)}
                            >
                              {t(locale, "merchants_edit")}
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => {
                                setMerchantToArchive(merchant);
                                setArchiveOpen(true);
                              }}
                            >
                              {t(locale, "merchants_archive")}
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => {
                                setMerchantToDelete(merchant);
                                setDeleteOpen(true);
                              }}
                            >
                              {t(locale, "merchants_delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm opacity-60">{t(locale, "merchants_no_items")}</p>
            )}
          </div>

          {showArchived ? (
            <div>
              <h2 className="text-sm font-semibold uppercase opacity-60">
                {t(locale, "merchants_archived")}
              </h2>
              {archivedMerchants.length ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t(locale, "merchants_name")}</th>
                        <th>{t(locale, "merchants_default_category")}</th>
                        <th>{t(locale, "merchants_default_kind")}</th>
                        <th>{t(locale, "merchants_aliases")}</th>
                        <th>{t(locale, "merchants_actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivedMerchants.map((merchant) => (
                        <tr key={merchant._id}>
                          <td>{merchant.name}</td>
                          <td>
                            {merchant.defaultCategoryId
                              ? categoryMap.get(merchant.defaultCategoryId) ?? "—"
                              : "—"}
                          </td>
                          <td>
                            {merchant.defaultKind
                              ? t(
                                  locale,
                                  merchant.defaultKind === "income"
                                    ? "category_kind_income"
                                    : "category_kind_expense"
                                )
                              : "—"}
                          </td>
                          <td>{merchant.aliases?.length ? merchant.aliases.join(", ") : "—"}</td>
                          <td>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => handleRestore(merchant)}
                                disabled={isSubmitting}
                              >
                                {t(locale, "merchants_restore")}
                              </button>
                              <button
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() => {
                                  setMerchantToDelete(merchant);
                                  setDeleteOpen(true);
                                }}
                              >
                                {t(locale, "merchants_delete")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-sm opacity-60">{t(locale, "merchants_no_archived")}</p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={editOpen}
        title={t(locale, editingMerchant ? "merchants_edit" : "merchants_add")}
        onClose={() => setEditOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <TextField
            id="merchant-name"
            label={t(locale, "merchants_name")}
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
          />
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "merchants_default_category")}
            </span>
            <select
              className="select select-bordered"
              value={editDefaultCategoryId}
              onChange={(event) => setEditDefaultCategoryId(event.target.value)}
            >
              <option value="">{t(locale, "merchants_default_category_none")}</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {categoryName(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "merchants_default_kind")}
            </span>
            <select
              className="select select-bordered"
              value={editDefaultKind}
              onChange={(event) => setEditDefaultKind(event.target.value)}
            >
              <option value="">{t(locale, "merchants_default_kind_any")}</option>
              <option value="expense">{t(locale, "category_kind_expense")}</option>
              <option value="income">{t(locale, "category_kind_income")}</option>
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "merchants_aliases")}
            </span>
            <input
              className="input input-bordered w-full"
              value={editAliases}
              onChange={(event) => setEditAliases(event.target.value)}
              placeholder={t(locale, "merchants_aliases_placeholder")}
            />
            <span className="mt-1 text-xs opacity-70">
              {t(locale, "merchants_aliases_helper")}
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" type="button" onClick={() => setEditOpen(false)}>
              {t(locale, "transactions_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting}>
              {editingMerchant ? t(locale, "merchants_save") : t(locale, "merchants_add")}
            </SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={archiveOpen}
        title={t(locale, "merchants_archive")}
        onClose={() => setArchiveOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-80">{t(locale, "merchants_archive_warning")}</p>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" type="button" onClick={() => setArchiveOpen(false)}>
              {t(locale, "transactions_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting} type="button" onClick={handleArchive}>
              {t(locale, "merchants_archive")}
            </SubmitButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title={t(locale, "merchants_delete")}
        onClose={() => setDeleteOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-80">{t(locale, "merchants_delete_warning")}</p>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" type="button" onClick={() => setDeleteOpen(false)}>
              {t(locale, "transactions_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting} type="button" onClick={handleDelete}>
              {t(locale, "merchants_delete_confirm")}
            </SubmitButton>
          </div>
        </div>
      </Modal>
    </section>
  );
}
