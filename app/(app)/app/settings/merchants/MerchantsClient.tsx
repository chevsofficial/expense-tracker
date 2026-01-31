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
  isArchived?: boolean;
};

type ApiListResponse<T> = { data: T[] };
type ApiItemResponse<T> = { data: T };

export function MerchantsClient({ locale }: { locale: Locale }) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const [renameOpen, setRenameOpen] = useState(false);
  const [merchantToRename, setMerchantToRename] = useState<Merchant | null>(null);
  const [renameName, setRenameName] = useState("");

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [merchantToArchive, setMerchantToArchive] = useState<Merchant | null>(null);

  const activeMerchants = useMemo(
    () => merchants.filter((merchant) => !merchant.isArchived),
    [merchants]
  );
  const archivedMerchants = useMemo(
    () => merchants.filter((merchant) => merchant.isArchived),
    [merchants]
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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      await postJSON<ApiItemResponse<Merchant>>("/api/merchants", {
        name: newName.trim(),
      });
      setAddOpen(false);
      setNewName("");
      await loadMerchants();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "merchants_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!merchantToRename || !renameName.trim()) return;
    setIsSubmitting(true);
    try {
      await putJSON<ApiItemResponse<Merchant>>(`/api/merchants/${merchantToRename._id}`, {
        name: renameName.trim(),
      });
      setRenameOpen(false);
      setMerchantToRename(null);
      setRenameName("");
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
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
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
              <ul className="mt-3 space-y-2">
                {activeMerchants.map((merchant) => (
                  <li key={merchant._id} className="flex items-center justify-between gap-2">
                    <span>{merchant.name}</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          setMerchantToRename(merchant);
                          setRenameName(merchant.name);
                          setRenameOpen(true);
                        }}
                      >
                        {t(locale, "merchants_rename")}
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
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm opacity-60">{t(locale, "merchants_empty")}</p>
            )}
          </div>

          {showArchived ? (
            <div>
              <h2 className="text-sm font-semibold uppercase opacity-60">
                {t(locale, "merchants_archived")}
              </h2>
              {archivedMerchants.length ? (
                <ul className="mt-3 space-y-2">
                  {archivedMerchants.map((merchant) => (
                    <li key={merchant._id} className="flex items-center justify-between gap-2">
                      <span>{merchant.name}</span>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleRestore(merchant)}
                        disabled={isSubmitting}
                      >
                        {t(locale, "merchants_restore")}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm opacity-60">{t(locale, "merchants_empty_archived")}</p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <Modal open={addOpen} title={t(locale, "merchants_add")} onClose={() => setAddOpen(false)}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <TextField
            id="merchant-name"
            label={t(locale, "merchants_name")}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" type="button" onClick={() => setAddOpen(false)}>
              {t(locale, "transactions_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting}>{t(locale, "merchants_add")}</SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={renameOpen}
        title={t(locale, "merchants_rename")}
        onClose={() => setRenameOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleRename}>
          <TextField
            id="merchant-rename"
            label={t(locale, "merchants_name")}
            value={renameName}
            onChange={(event) => setRenameName(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" type="button" onClick={() => setRenameOpen(false)}>
              {t(locale, "transactions_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting}>{t(locale, "merchants_save")}</SubmitButton>
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
    </section>
  );
}
