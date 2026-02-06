"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type Account = {
  _id: string;
  name: string;
  isArchived?: boolean;
};

type ApiListResponse<T> = { data: T[] };

type ApiItemResponse<T> = { data: T };

type DeleteResponse = { data: { deleted: boolean } };

export function AccountsClient({ locale }: { locale: Locale }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState("");

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [accountToArchive, setAccountToArchive] = useState<Account | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.isArchived),
    [accounts]
  );
  const archivedAccounts = useMemo(
    () => accounts.filter((account) => account.isArchived),
    [accounts]
  );

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getJSON<ApiListResponse<Account>>(
        "/api/accounts?includeArchived=true"
      );
      setAccounts(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "accounts_generic_error");
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const openAdd = () => {
    setEditingAccount(null);
    setEditName("");
    setEditOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setEditName(account.name);
    setEditOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editName.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: editName.trim(),
      };
      if (editingAccount) {
        await putJSON<ApiItemResponse<Account>>(`/api/accounts/${editingAccount._id}`, payload);
      } else {
        await postJSON<ApiItemResponse<Account>>("/api/accounts", payload);
      }
      setEditOpen(false);
      setEditingAccount(null);
      await loadAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "accounts_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!accountToArchive) return;
    setIsSubmitting(true);
    try {
      await delJSON<ApiItemResponse<Account>>(`/api/accounts/${accountToArchive._id}`);
      setArchiveOpen(false);
      setAccountToArchive(null);
      await loadAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "accounts_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;
    setIsSubmitting(true);
    try {
      await delJSON<DeleteResponse>(`/api/accounts/${accountToDelete._id}?hard=1`);
      setDeleteOpen(false);
      setAccountToDelete(null);
      await loadAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "accounts_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async (account: Account) => {
    setIsSubmitting(true);
    try {
      await putJSON<ApiItemResponse<Account>>(`/api/accounts/${account._id}`, {
        isArchived: false,
      });
      await loadAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "accounts_generic_error");
      setToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral">{t(locale, "accounts_title")}</h1>
          <p className="text-sm opacity-70">{t(locale, "accounts_subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            {t(locale, "accounts_add")}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            {t(locale, "accounts_show_archived")}
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
          {loading ? <p className="text-sm opacity-70">{t(locale, "accounts_loading")}</p> : null}
          <div>
            <h2 className="text-sm font-semibold uppercase opacity-60">
              {t(locale, "accounts_active")}
            </h2>
            {activeAccounts.length === 0 ? (
              <p className="mt-3 text-sm opacity-70">{t(locale, "accounts_empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="bg-base-200 text-base-content">
                    <tr>
                      <th>{t(locale, "accounts_name")}</th>
                      <th className="text-right">{t(locale, "accounts_actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAccounts.map((account) => (
                      <tr key={account._id}>
                        <td className="font-medium">{account.name}</td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => openEdit(account)}
                            >
                              {t(locale, "accounts_edit")}
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => {
                                setAccountToArchive(account);
                                setArchiveOpen(true);
                              }}
                            >
                              {t(locale, "accounts_archive")}
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => {
                                setAccountToDelete(account);
                                setDeleteOpen(true);
                              }}
                            >
                              {t(locale, "accounts_delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {showArchived ? (
            <div>
              <h2 className="text-sm font-semibold uppercase opacity-60">
                {t(locale, "accounts_archived")}
              </h2>
              {archivedAccounts.length === 0 ? (
                <p className="mt-3 text-sm opacity-70">{t(locale, "accounts_archived_empty")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="bg-base-200 text-base-content">
                      <tr>
                        <th>{t(locale, "accounts_name")}</th>
                        <th className="text-right">{t(locale, "accounts_actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivedAccounts.map((account) => (
                        <tr key={account._id}>
                          <td className="font-medium">{account.name}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => void handleRestore(account)}
                              >
                                {t(locale, "accounts_restore")}
                              </button>
                              <button
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() => {
                                  setAccountToDelete(account);
                                  setDeleteOpen(true);
                                }}
                              >
                                {t(locale, "accounts_delete")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={editOpen}
        title={t(locale, editingAccount ? "accounts_edit" : "accounts_add")}
        onClose={() => setEditOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <TextField
            id="account-name"
            label={t(locale, "accounts_name")}
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            placeholder={t(locale, "accounts_name_placeholder")}
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(false)}>
              {t(locale, "accounts_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting}>{t(locale, "accounts_save")}</SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={archiveOpen}
        title={t(locale, "accounts_archive_title")}
        onClose={() => setArchiveOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70">{t(locale, "accounts_archive_body")}</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setArchiveOpen(false)}>
              {t(locale, "accounts_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleArchive}>
              {t(locale, "accounts_archive_confirm")}
            </SubmitButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title={t(locale, "accounts_delete_title")}
        onClose={() => setDeleteOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70">{t(locale, "accounts_delete_body")}</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteOpen(false)}>
              {t(locale, "accounts_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleDelete}>
              {t(locale, "accounts_delete_confirm")}
            </SubmitButton>
          </div>
        </div>
      </Modal>
    </section>
  );
}
