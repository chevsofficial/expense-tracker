"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageActions } from "@/components/ui/PageActions";
import { SelectionToggle } from "@/components/ui/SelectionToggle";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { formGrid, labelBase, fieldBase } from "@/components/ui/formStyles";
import { CHIP_CLASS_NO_PADDING } from "@/components/ui/uiClasses";
import {
  tableBaseClass,
  tableBodyClass,
  tableHeadClass,
} from "@/components/ui/tableStyles";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type Merchant = {
  _id: string;
  name: string;
  aliases?: string[];
  isArchived?: boolean;
};

type ApiListResponse<T> = { data: T[] };
type ApiItemResponse<T> = { data: T };
type DeleteResponse = { data: { deleted: boolean } };

export function MerchantsClient({ locale }: { locale: Locale }) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [editOpen, setEditOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [editName, setEditName] = useState("");
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

  useEffect(() => {
    void loadMerchants();
  }, [loadMerchants]);

  const openAdd = () => {
    setEditingMerchant(null);
    setEditName("");
    setEditAliases("");
    setEditOpen(true);
  };

  const openEdit = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setEditName(merchant.name);
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


  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (rows: Merchant[], checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      rows.forEach((row) => {
        if (checked) next.add(row._id); else next.delete(row._id);
      });
      return next;
    });
  };

  const handleBulkAction = async (action: "archive" | "unarchive" | "delete") => {
    if (!selectedIds.size) return;
    if (action === "delete" && !window.confirm(`Delete ${selectedIds.size} items? This cannot be undone.`)) return;
    setIsSubmitting(true);
    try {
      await postJSON<{ data: { updated?: number; deleted?: number } }>("/api/merchants/bulk", { action, ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
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
        <PageHeader title={t(locale, "merchants_title")} />
        <PageActions
          addLabel={t(locale, "merchants_add")}
          onAdd={openAdd}
          showArchived={showArchived}
          onToggleArchived={setShowArchived}
          archivedLabel={t(locale, "merchants_show_archived")}
        />
      </div>

      {toast ? (
        <div className="alert alert-error flex items-center justify-between">
          <span>{toast}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setToast(null)}>
            {t(locale, "transactions_dismiss")}
          </button>
        </div>
      ) : null}

      {selectedIds.size ? (
        <div className="alert flex flex-wrap items-center justify-between gap-3">
          <span>{selectedIds.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => void handleBulkAction("archive")} disabled={isSubmitting}>Archive selected</button>
            {showArchived ? <button className="btn btn-ghost btn-sm" onClick={() => void handleBulkAction("unarchive")} disabled={isSubmitting}>Unarchive selected</button> : null}
            <button className="btn btn-ghost btn-sm text-error" onClick={() => void handleBulkAction("delete")} disabled={isSubmitting}>Delete selected</button>
          </div>
        </div>
      ) : null}

      <div className={CHIP_CLASS_NO_PADDING}>
        <div className="card-body space-y-6">
          {loading ? <p className="text-sm opacity-70">{t(locale, "merchants_loading")}</p> : null}
          <div>
            <h2 className="text-sm font-semibold uppercase opacity-60">
              {t(locale, "merchants_active")}
            </h2>
            {activeMerchants.length ? (
              <DataTable className="mt-3">
                <table className={tableBaseClass}>
                  <thead className={tableHeadClass}>
                    <tr>
                      <th><SelectionToggle checked={activeMerchants.length > 0 && activeMerchants.every((merchant) => selectedIds.has(merchant._id))} onChange={(next) => toggleSelectAll(activeMerchants, next)} size="sm" ariaLabel="Select all active merchants" /></th>
                      <th>{t(locale, "merchants_name")}</th>
                      <th>{t(locale, "merchants_actions")}</th>
                    </tr>
                  </thead>
                  <tbody className={tableBodyClass}>
                    {activeMerchants.map((merchant) => (
                      <tr key={merchant._id}>
                        <td><SelectionToggle checked={selectedIds.has(merchant._id)} onChange={(next) => toggleSelectOne(merchant._id, next)} size="sm" ariaLabel={`Select ${merchant.name}`} /></td>
                        <td>{merchant.name}</td>
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
              </DataTable>
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
                <DataTable className="mt-3">
                    <table className={tableBaseClass}>
                      <thead className={tableHeadClass}>
                      <tr>
                        <th><SelectionToggle checked={archivedMerchants.length > 0 && archivedMerchants.every((merchant) => selectedIds.has(merchant._id))} onChange={(next) => toggleSelectAll(archivedMerchants, next)} size="sm" ariaLabel="Select all archived merchants" /></th>
                        <th>{t(locale, "merchants_name")}</th>
                        <th>{t(locale, "merchants_actions")}</th>
                      </tr>
                    </thead>
                    <tbody className={tableBodyClass}>
                      {archivedMerchants.map((merchant) => (
                        <tr key={merchant._id}>
                          <td><SelectionToggle checked={selectedIds.has(merchant._id)} onChange={(next) => toggleSelectOne(merchant._id, next)} size="sm" ariaLabel={`Select ${merchant.name}`} /></td>
                          <td>{merchant.name}</td>
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
                </DataTable>
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
          <div className={formGrid}>
          <TextField
            id="merchant-name"
            label={t(locale, "merchants_name")}
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
          />
          <label className="w-full">
            <span className={labelBase}>
              {t(locale, "merchants_aliases")}
            </span>
            <input
              className={fieldBase}
              value={editAliases}
              onChange={(event) => setEditAliases(event.target.value)}
              placeholder={t(locale, "merchants_aliases_placeholder")}
            />
            <span className="mt-1 text-xs opacity-70">
              {t(locale, "merchants_aliases_helper")}
            </span>
          </label>
          </div>
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
