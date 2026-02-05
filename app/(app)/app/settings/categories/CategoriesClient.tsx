"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type CategoryGroup = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  isArchived?: boolean;
};

type CategoryKind = "income" | "expense";

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  groupId: string;
  kind?: CategoryKind | "both";
  isArchived?: boolean;
};

type ApiListResponse<T> = { data: T[] };

type ApiItemResponse<T> = { data: T };

type DeleteResponse = { data: { deleted: boolean } };

const normalizeKind = (kind?: CategoryKind | "both"): CategoryKind =>
  kind === "income" ? "income" : "expense";

export function CategoriesClient({ locale }: { locale: Locale }) {
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [renameGroupOpen, setRenameGroupOpen] = useState(false);
  const [groupToRename, setGroupToRename] = useState<CategoryGroup | null>(null);
  const [renameGroupName, setRenameGroupName] = useState("");

  const [archiveGroupOpen, setArchiveGroupOpen] = useState(false);
  const [groupToArchive, setGroupToArchive] = useState<CategoryGroup | null>(null);

  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<CategoryGroup | null>(null);
  const [cascadeDeleteGroup, setCascadeDeleteGroup] = useState(false);

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryKind, setNewCategoryKind] = useState<CategoryKind>("expense");
  const [newCategoryGroupId, setNewCategoryGroupId] = useState<string>("");

  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryKind, setEditCategoryKind] = useState<CategoryKind>("expense");
  const [editCategoryGroupId, setEditCategoryGroupId] = useState<string>("");

  const [archiveCategoryOpen, setArchiveCategoryOpen] = useState(false);
  const [categoryToArchive, setCategoryToArchive] = useState<Category | null>(null);

  const [deleteCategoryOpen, setDeleteCategoryOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const kindOptions = [
    { value: "expense" as const, label: t(locale, "category_kind_expense") },
    { value: "income" as const, label: t(locale, "category_kind_income") },
  ];

  const kindLabels: Record<CategoryKind, string> = {
    income: t(locale, "category_kind_income"),
    expense: t(locale, "category_kind_expense"),
  };

  const selectedGroup = useMemo(
    () => groups.find((group) => group._id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const activeGroups = useMemo(() => groups.filter((group) => !group.isArchived), [groups]);
  const archivedGroups = useMemo(() => groups.filter((group) => group.isArchived), [groups]);

  const categoriesForGroup = useMemo(() => {
    if (!selectedGroupId) return [];
    return categories.filter((category) => category.groupId === selectedGroupId);
  }, [categories, selectedGroupId]);

  const activeCategoriesForGroup = useMemo(
    () => categoriesForGroup.filter((category) => !category.isArchived),
    [categoriesForGroup]
  );

  const archivedCategoriesForGroup = useMemo(
    () => categoriesForGroup.filter((category) => category.isArchived),
    [categoriesForGroup]
  );

  const getDisplayName = (item: { nameCustom?: string; nameKey?: string }) =>
    item.nameCustom?.trim() || item.nameKey || t(locale, "category_fallback_name");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [groupResponse, categoryResponse] = await Promise.all([
        getJSON<ApiListResponse<CategoryGroup>>("/api/category-groups?includeArchived=true"),
        getJSON<ApiListResponse<Category>>("/api/categories?includeArchived=true"),
      ]);

      const fetchedGroups = groupResponse.data;
      const fetchedCategories = categoryResponse.data;
      const nextActiveGroups = fetchedGroups.filter((group) => !group.isArchived);

      setGroups(fetchedGroups);
      setCategories(fetchedCategories);
      setSelectedGroupId((current) => {
        if (current && fetchedGroups.some((group) => group._id === current)) {
          return current;
        }
        return nextActiveGroups[0]?._id ?? fetchedGroups[0]?._id ?? null;
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t(locale, "categories_load_error");
      setError(message);
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!showArchived && selectedGroupId) {
      const selected = groups.find((group) => group._id === selectedGroupId);
      if (selected?.isArchived) {
        setSelectedGroupId(activeGroups[0]?._id ?? null);
      }
    }
  }, [activeGroups, groups, selectedGroupId, showArchived]);

  const handleError = (err: unknown) => {
    const message =
      err instanceof Error ? err.message : t(locale, "categories_generic_error");
    setToast(message);
  };

  const handleCreateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newGroupName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await postJSON<ApiItemResponse<CategoryGroup>>(
        "/api/category-groups",
        { nameCustom: newGroupName.trim() }
      );
      setAddGroupOpen(false);
      setNewGroupName("");
      setSelectedGroupId(response.data._id);
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!groupToRename || !renameGroupName.trim()) return;

    setIsSubmitting(true);
    try {
      await putJSON<ApiItemResponse<CategoryGroup>>(
        `/api/category-groups/${groupToRename._id}`,
        { nameCustom: renameGroupName.trim() }
      );
      setRenameGroupOpen(false);
      setGroupToRename(null);
      setRenameGroupName("");
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveGroup = async () => {
    if (!groupToArchive) return;

    setIsSubmitting(true);
    try {
      await delJSON<ApiItemResponse<CategoryGroup>>(
        `/api/category-groups/${groupToArchive._id}`
      );
      setArchiveGroupOpen(false);
      setGroupToArchive(null);
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    setIsSubmitting(true);
    try {
      const cascadeParam = cascadeDeleteGroup ? "&cascade=1" : "";
      await delJSON<DeleteResponse>(
        `/api/category-groups/${groupToDelete._id}?hard=1${cascadeParam}`
      );
      setDeleteGroupOpen(false);
      setGroupToDelete(null);
      setCascadeDeleteGroup(false);
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCategoryName.trim() || !newCategoryGroupId) return;

    setIsSubmitting(true);
    try {
      await postJSON<ApiItemResponse<Category>>("/api/categories", {
        nameCustom: newCategoryName.trim(),
        kind: newCategoryKind,
        groupId: newCategoryGroupId,
      });
      setAddCategoryOpen(false);
      setNewCategoryName("");
      setNewCategoryKind("expense");
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryToEdit || !editCategoryName.trim() || !editCategoryGroupId) return;

    setIsSubmitting(true);
    try {
      await putJSON<ApiItemResponse<Category>>(`/api/categories/${categoryToEdit._id}`, {
        nameCustom: editCategoryName.trim(),
        groupId: editCategoryGroupId,
        kind: editCategoryKind,
      });
      setEditCategoryOpen(false);
      setCategoryToEdit(null);
      setEditCategoryName("");
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveCategory = async () => {
    if (!categoryToArchive) return;

    setIsSubmitting(true);
    try {
      await delJSON<ApiItemResponse<Category>>(`/api/categories/${categoryToArchive._id}`);
      setArchiveCategoryOpen(false);
      setCategoryToArchive(null);
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsSubmitting(true);
    try {
      await delJSON<DeleteResponse>(`/api/categories/${categoryToDelete._id}?hard=1`);
      setDeleteCategoryOpen(false);
      setCategoryToDelete(null);
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRenameModal = (group: CategoryGroup) => {
    setGroupToRename(group);
    setRenameGroupName(getDisplayName(group));
    setRenameGroupOpen(true);
  };

  const openArchiveGroupModal = (group: CategoryGroup) => {
    setGroupToArchive(group);
    setArchiveGroupOpen(true);
  };

  const openDeleteGroupModal = (group: CategoryGroup) => {
    setGroupToDelete(group);
    setCascadeDeleteGroup(false);
    setDeleteGroupOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setCategoryToEdit(category);
    setEditCategoryName(getDisplayName(category));
    setEditCategoryKind(normalizeKind(category.kind));
    setEditCategoryGroupId(category.groupId);
    setEditCategoryOpen(true);
  };

  const openArchiveCategoryModal = (category: Category) => {
    setCategoryToArchive(category);
    setArchiveCategoryOpen(true);
  };

  const openDeleteCategoryModal = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteCategoryOpen(true);
  };

  const handleRestoreGroup = async (group: CategoryGroup) => {
    setIsSubmitting(true);
    try {
      await putJSON<ApiItemResponse<CategoryGroup>>(`/api/category-groups/${group._id}`, {
        isArchived: false,
      });
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreCategory = async (category: Category) => {
    setIsSubmitting(true);
    try {
      await putJSON<ApiItemResponse<Category>>(`/api/categories/${category._id}`, {
        isArchived: false,
      });
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddCategoryModal = () => {
    const selectedActiveGroup =
      selectedGroupId && !selectedGroup?.isArchived ? selectedGroupId : activeGroups[0]?._id;
    if (!selectedActiveGroup) return;
    setNewCategoryGroupId(selectedActiveGroup);
    setAddCategoryOpen(true);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral">{t(locale, "categories_title_page")}</h1>
          <p className="mt-2 opacity-70">{t(locale, "categories_subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            {t(locale, "show_archived")}
          </label>
        </div>
      </div>

      {toast ? (
        <div className="alert alert-error flex items-center justify-between">
          <span>{toast}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setToast(null)}>
            {t(locale, "categories_dismiss")}
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px,1fr]">
        <div className="card bg-base-100 shadow">
          <div className="card-body gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t(locale, "groups_title")}</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setAddGroupOpen(true)}>
                {t(locale, "add_group")}
              </button>
            </div>
            {loading ? (
              <p className="text-sm opacity-70">{t(locale, "categories_loading_groups")}</p>
            ) : null}
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <div className="flex flex-col gap-2">
              {activeGroups.length === 0 && !loading ? (
                <p className="text-sm opacity-70">{t(locale, "categories_no_groups")}</p>
              ) : null}
              {showArchived ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                    {t(locale, "categories_active_groups")}
                  </p>
                  {activeGroups.map((group) => (
                    <div
                      key={group._id}
                      className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition ${
                        selectedGroupId === group._id
                          ? "bg-base-200 font-medium"
                          : "hover:bg-base-200"
                      }`}
                    >
                      <button
                        className="flex-1 text-left"
                        onClick={() => setSelectedGroupId(group._id)}
                      >
                        {getDisplayName(group)}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            openRenameModal(group);
                          }}
                        >
                          {t(locale, "categories_rename")}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            openArchiveGroupModal(group);
                          }}
                        >
                          {t(locale, "categories_archive")}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDeleteGroupModal(group);
                          }}
                        >
                          {t(locale, "categories_delete")}
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="pt-2 text-xs font-semibold uppercase tracking-wide opacity-60">
                    {t(locale, "categories_archived_groups")}
                  </p>
                  {archivedGroups.length === 0 ? (
                    <p className="text-sm opacity-70">
                      {t(locale, "categories_no_archived_groups")}
                    </p>
                  ) : null}
                  {archivedGroups.map((group) => (
                    <div
                      key={group._id}
                      className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition ${
                        selectedGroupId === group._id
                          ? "bg-base-200 font-medium"
                          : "hover:bg-base-200"
                      }`}
                    >
                      <button
                        className="flex-1 text-left"
                        onClick={() => setSelectedGroupId(group._id)}
                      >
                        {getDisplayName(group)}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRestoreGroup(group);
                          }}
                        >
                          {t(locale, "categories_restore")}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDeleteGroupModal(group);
                          }}
                        >
                          {t(locale, "categories_delete")}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                activeGroups.map((group) => (
                  <div
                    key={group._id}
                    className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition ${
                      selectedGroupId === group._id
                        ? "bg-base-200 font-medium"
                        : "hover:bg-base-200"
                    }`}
                  >
                    <button
                      className="flex-1 text-left"
                      onClick={() => setSelectedGroupId(group._id)}
                    >
                      {getDisplayName(group)}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          openRenameModal(group);
                        }}
                      >
                        {t(locale, "categories_rename")}
                      </button>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          openArchiveGroupModal(group);
                        }}
                      >
                        {t(locale, "categories_archive")}
                      </button>
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDeleteGroupModal(group);
                        }}
                      >
                        {t(locale, "categories_delete")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t(locale, "categories_title")}</h2>
              <button
                className="btn btn-primary btn-sm"
                onClick={openAddCategoryModal}
                disabled={!selectedGroupId || selectedGroup?.isArchived}
              >
                {t(locale, "add_category")}
              </button>
            </div>
            {selectedGroup ? (
              <p className="text-sm opacity-70">{t(locale, "categories_group_helper")}</p>
            ) : null}

            {!selectedGroupId ? (
              <div className="rounded-md border border-dashed border-base-300 p-6 text-sm opacity-70">
                {t(locale, "categories_empty_group")}
              </div>
            ) : null}

            {showArchived && selectedGroupId ? (
              <p className="text-sm font-semibold uppercase tracking-wide opacity-60">
                {t(locale, "categories_active_categories")}
              </p>
            ) : null}

            {selectedGroupId && activeCategoriesForGroup.length === 0 && !loading ? (
              <div className="rounded-md border border-dashed border-base-300 p-6 text-sm opacity-70">
                {t(locale, "categories_no_categories")}
              </div>
            ) : null}

            {selectedGroupId && activeCategoriesForGroup.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="bg-base-200 text-base-content">
                    <tr>
                      <th>{t(locale, "categories_name")}</th>
                      <th>{t(locale, "categories_kind")}</th>
                      <th className="text-right">{t(locale, "categories_actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCategoriesForGroup.map((category) => (
                      <tr key={category._id}>
                        <td className="font-medium">{getDisplayName(category)}</td>
                        <td>
                          <span className="badge badge-outline">
                            {kindLabels[normalizeKind(category.kind)]}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => openEditCategoryModal(category)}
                            >
                              {t(locale, "categories_edit")}
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => openArchiveCategoryModal(category)}
                            >
                              {t(locale, "categories_archive")}
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => openDeleteCategoryModal(category)}
                            >
                              {t(locale, "categories_delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {showArchived && selectedGroupId ? (
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-wide opacity-60">
                  {t(locale, "categories_archived_categories")}
                </p>
                {archivedCategoriesForGroup.length === 0 ? (
                  <div className="rounded-md border border-dashed border-base-300 p-6 text-sm opacity-70">
                    {t(locale, "categories_no_archived_categories")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead className="bg-base-200 text-base-content">
                        <tr>
                          <th>{t(locale, "categories_name")}</th>
                          <th>{t(locale, "categories_kind")}</th>
                          <th className="text-right">{t(locale, "categories_actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedCategoriesForGroup.map((category) => (
                          <tr key={category._id}>
                            <td className="font-medium">{getDisplayName(category)}</td>
                            <td>
                              <span className="badge badge-outline">
                                {kindLabels[normalizeKind(category.kind)]}
                              </span>
                            </td>
                            <td className="text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => void handleRestoreCategory(category)}
                                >
                                  {t(locale, "categories_restore")}
                                </button>
                                <button
                                  className="btn btn-ghost btn-xs text-error"
                                  onClick={() => openDeleteCategoryModal(category)}
                                >
                                  {t(locale, "categories_delete")}
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
      </div>

      <Modal
        open={addGroupOpen}
        title={t(locale, "categories_add_group_title")}
        onClose={() => setAddGroupOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleCreateGroup}>
          <TextField
            id="new-group-name"
            label={t(locale, "categories_group_name")}
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            placeholder={t(locale, "categories_group_placeholder")}
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setAddGroupOpen(false)}>
              {t(locale, "categories_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting}>
              {t(locale, "categories_create_group")}
            </SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={renameGroupOpen}
        title={t(locale, "categories_rename_group_title")}
        onClose={() => setRenameGroupOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleRenameGroup}>
          <TextField
            id="rename-group-name"
            label={t(locale, "categories_group_name")}
            value={renameGroupName}
            onChange={(event) => setRenameGroupName(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setRenameGroupOpen(false)}
            >
              {t(locale, "categories_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting}>{t(locale, "categories_save")}</SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={archiveGroupOpen}
        title={t(locale, "categories_archive_group_title")}
        onClose={() => setArchiveGroupOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70">{t(locale, "categories_archive_group_body")}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setArchiveGroupOpen(false)}
            >
              {t(locale, "categories_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleArchiveGroup}>
              {t(locale, "categories_archive_group_confirm")}
            </SubmitButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteGroupOpen}
        title={t(locale, "categories_delete_group_title")}
        onClose={() => setDeleteGroupOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70">{t(locale, "categories_delete_group_body")}</p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-error checkbox-sm"
              checked={cascadeDeleteGroup}
              onChange={(event) => setCascadeDeleteGroup(event.target.checked)}
            />
            <span>{t(locale, "categories_delete_group_cascade")}</span>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDeleteGroupOpen(false)}
            >
              {t(locale, "categories_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleDeleteGroup}>
              {t(locale, "categories_delete_permanently")}
            </SubmitButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={addCategoryOpen}
        title={t(locale, "categories_add_category_title")}
        onClose={() => setAddCategoryOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleCreateCategory}>
          <TextField
            id="new-category-name"
            label={t(locale, "categories_category_name")}
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder={t(locale, "categories_category_placeholder")}
          />
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "categories_group_label")}
            </span>
            <select
              className="select select-bordered w-full"
              value={newCategoryGroupId}
              onChange={(event) => setNewCategoryGroupId(event.target.value)}
            >
              {activeGroups.map((group) => (
                <option key={group._id} value={group._id}>
                  {getDisplayName(group)}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "categories_kind_label")}
            </span>
            <select
              className="select select-bordered w-full"
              value={newCategoryKind}
              onChange={(event) => setNewCategoryKind(event.target.value as CategoryKind)}
            >
              {kindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAddCategoryOpen(false)}
            >
              {t(locale, "categories_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting}>
              {t(locale, "categories_create_category")}
            </SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={editCategoryOpen}
        title={t(locale, "categories_edit_category_title")}
        onClose={() => setEditCategoryOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleEditCategory}>
          <TextField
            id="edit-category-name"
            label={t(locale, "categories_category_name")}
            value={editCategoryName}
            onChange={(event) => setEditCategoryName(event.target.value)}
          />
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "categories_group_label")}
            </span>
            <select
              className="select select-bordered w-full"
              value={editCategoryGroupId}
              onChange={(event) => setEditCategoryGroupId(event.target.value)}
            >
              {activeGroups.map((group) => (
                <option key={group._id} value={group._id}>
                  {getDisplayName(group)}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">
              {t(locale, "categories_kind_label")}
            </span>
            <select
              className="select select-bordered w-full"
              value={editCategoryKind}
              onChange={(event) => setEditCategoryKind(event.target.value as CategoryKind)}
            >
              {kindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditCategoryOpen(false)}
            >
              {t(locale, "categories_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting}>{t(locale, "categories_save")}</SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={archiveCategoryOpen}
        title={t(locale, "categories_archive_category_title")}
        onClose={() => setArchiveCategoryOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70">
            {t(locale, "categories_archive_category_body")}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setArchiveCategoryOpen(false)}
            >
              {t(locale, "categories_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleArchiveCategory}>
              {t(locale, "categories_archive_category_confirm")}
            </SubmitButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteCategoryOpen}
        title={t(locale, "categories_delete_category_title")}
        onClose={() => setDeleteCategoryOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70">
            {t(locale, "categories_delete_category_body")}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDeleteCategoryOpen(false)}
            >
              {t(locale, "categories_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleDeleteCategory}>
              {t(locale, "categories_delete_permanently")}
            </SubmitButton>
          </div>
        </div>
      </Modal>
    </section>
  );
}
