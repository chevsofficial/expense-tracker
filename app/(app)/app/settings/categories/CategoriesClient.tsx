"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageActions } from "@/components/ui/PageActions";
import { SelectionToggle } from "@/components/ui/SelectionToggle";
import { addButtonClass } from "@/components/ui/buttonStyles";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { EmojiPickerPopover } from "@/components/ui/EmojiPickerPopover";
import { CHIP_CLASS_NO_PADDING } from "@/components/ui/uiClasses";
import {
  tableBaseClass,
  tableBodyClass,
  tableHeadClass,
} from "@/components/ui/tableStyles";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import type { Category, CategoryKind } from "@/src/types/category";

type CategoryGroup = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  isArchived?: boolean;
};

type CategoryFormKind = CategoryKind;

type ApiListResponse<T> = { data: T[] };

type ApiItemResponse<T> = { data: T };

type DeleteResponse = { data: { deleted: boolean } };

type CategoryDeleteReferences = {
  transactionCount: number;
  budgetMonthCount: number;
  budgetActiveCount: number;
  budgetArchivedCount: number;
};

type CategoryDeletePreviewResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  references?: CategoryDeleteReferences;
};

const normalizeKind = (kind?: CategoryKind | null): CategoryFormKind =>
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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

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
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("");
  const [newCategoryKind, setNewCategoryKind] = useState<CategoryFormKind>("expense");
  const [newCategoryGroupId, setNewCategoryGroupId] = useState<string>("");

  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryEmoji, setEditCategoryEmoji] = useState("");
  const [editCategoryKind, setEditCategoryKind] = useState<CategoryFormKind>("expense");
  const [editCategoryGroupId, setEditCategoryGroupId] = useState<string>("");

  const [archiveCategoryOpen, setArchiveCategoryOpen] = useState(false);
  const [categoryToArchive, setCategoryToArchive] = useState<Category | null>(null);

  const [deleteCategoryOpen, setDeleteCategoryOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteCategoryReferences, setDeleteCategoryReferences] =
    useState<CategoryDeleteReferences | null>(null);
  const [deleteCategoryMessage, setDeleteCategoryMessage] = useState<string | null>(null);

  const kindOptions = [
    { value: "expense" as const, label: t(locale, "category_kind_expense") },
    { value: "income" as const, label: t(locale, "category_kind_income") },
  ];

  const kindLabels: Record<CategoryFormKind, string> = {
    income: t(locale, "category_kind_income"),
    expense: t(locale, "category_kind_expense"),
  };

  const selectedGroup = useMemo(
    () => groups.find((group) => group._id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const activeGroups = useMemo(() => groups.filter((group) => !group.isArchived), [groups]);
  const visibleGroups = useMemo(() => (showArchived ? groups : activeGroups), [showArchived, groups, activeGroups]);

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

  const getCategoryLabel = (category: Category) =>
    `${category.emoji ? `${category.emoji} ` : ""}${getDisplayName(category)}`;

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
        emoji: newCategoryEmoji.trim() ? newCategoryEmoji.trim() : null,
        kind: newCategoryKind,
        groupId: newCategoryGroupId,
      });
      setAddCategoryOpen(false);
      setNewCategoryName("");
      setNewCategoryEmoji("");
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
        emoji: editCategoryEmoji.trim() ? editCategoryEmoji.trim() : null,
        groupId: editCategoryGroupId ? editCategoryGroupId : null,
        kind: editCategoryKind,
      });
      setEditCategoryOpen(false);
      setCategoryToEdit(null);
      setEditCategoryName("");
      setEditCategoryEmoji("");
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
      if (!deleteCategoryReferences) {
        const previewResponse = await fetch(`/api/categories/${categoryToDelete._id}?hard=1`, {
          method: "DELETE",
          headers: { Accept: "application/json" },
        });

        if (previewResponse.status === 409) {
          const payload = (await previewResponse
            .json()
            .catch(() => null)) as CategoryDeletePreviewResponse | null;

          if (payload?.code === "CATEGORY_HAS_REFERENCES" && payload.references) {
            setDeleteCategoryMessage(payload.message ?? null);
            setDeleteCategoryReferences(payload.references);
            return;
          }
        }

        if (!previewResponse.ok) {
          const payload = (await previewResponse
            .json()
            .catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(payload?.error?.message ?? previewResponse.statusText);
        }
      } else {
        await delJSON<DeleteResponse>(`/api/categories/${categoryToDelete._id}?hard=1&force=1`);
      }

      setDeleteCategoryOpen(false);
      setCategoryToDelete(null);
      setDeleteCategoryReferences(null);
      setDeleteCategoryMessage(null);
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
    setEditCategoryEmoji(category.emoji ?? "");
    setEditCategoryKind(normalizeKind(category.kind));
    setEditCategoryGroupId(category.groupId ?? "");
    setEditCategoryOpen(true);
  };

  const openArchiveCategoryModal = (category: Category) => {
    setCategoryToArchive(category);
    setArchiveCategoryOpen(true);
  };

  const openDeleteCategoryModal = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteCategoryReferences(null);
    setDeleteCategoryMessage(null);
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


  const toggleSelectMany = (
    ids: string[],
    checked: boolean,
    setter: (value: Set<string> | ((current: Set<string>) => Set<string>)) => void
  ) => {
    setter((current) => {
      const next = new Set(current);
      ids.forEach((id) => {
        if (checked) next.add(id); else next.delete(id);
      });
      return next;
    });
  };

  const handleBulkGroups = async (action: "archive" | "unarchive" | "delete") => {
    if (!selectedGroupIds.size) return;
    if (action === "delete" && !window.confirm(`Delete ${selectedGroupIds.size} items? This cannot be undone.`)) return;
    setIsSubmitting(true);
    try {
      await postJSON<{ data: { updated?: number; deleted?: number } }>("/api/category-groups/bulk", { action, ids: Array.from(selectedGroupIds) });
      setSelectedGroupIds(new Set());
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkCategories = async (action: "archive" | "unarchive" | "delete") => {
    if (!selectedCategoryIds.size) return;
    if (action === "delete" && !window.confirm(`Delete ${selectedCategoryIds.size} items? This cannot be undone.`)) return;
    setIsSubmitting(true);
    try {
      await postJSON<{ data: { updated?: number; deleted?: number } }>("/api/categories/bulk", { action, ids: Array.from(selectedCategoryIds) });
      setSelectedCategoryIds(new Set());
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
    setNewCategoryEmoji("");
    setAddCategoryOpen(true);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title={t(locale, "categories_title_page")} />
        <PageActions
          addLabel={t(locale, "add_group")}
          onAdd={() => setAddGroupOpen(true)}
          showArchived={showArchived}
          onToggleArchived={setShowArchived}
          archivedLabel={t(locale, "show_archived")}
        />
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
        <div className={CHIP_CLASS_NO_PADDING}>
          <div className="card-body gap-4">
            {selectedGroupIds.size ? (<div className="alert flex flex-wrap items-center justify-between gap-3"><span>{selectedGroupIds.size} selected</span><div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => void handleBulkGroups("archive")} disabled={isSubmitting}>Archive selected</button>{showArchived ? <button className="btn btn-ghost btn-sm" onClick={() => void handleBulkGroups("unarchive")} disabled={isSubmitting}>Unarchive selected</button> : null}<button className="btn btn-ghost btn-sm text-error" onClick={() => void handleBulkGroups("delete")} disabled={isSubmitting}>Delete selected</button></div></div>) : null}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t(locale, "groups_title")}</h2>
            </div>
            {loading ? (
              <p className="text-sm opacity-70">{t(locale, "categories_loading_groups")}</p>
            ) : null}
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <div className="flex flex-col gap-2">
              {visibleGroups.length === 0 && !loading ? (
                <p className="text-sm opacity-70">
                  {showArchived
                    ? t(locale, "categories_no_archived_groups")
                    : t(locale, "categories_no_groups")}
                </p>
              ) : null}

              {visibleGroups.length > 0 ? (
                <DataTable>
                  <table className={tableBaseClass}>
                    <thead className={tableHeadClass}>
                      <tr>
                        <th className="w-10">
                          <SelectionToggle
                            checked={
                              visibleGroups.length > 0 &&
                              visibleGroups.every((group) => selectedGroupIds.has(group._id))
                            }
                            onChange={(next) =>
                              toggleSelectMany(
                                visibleGroups.map((group) => group._id),
                                next,
                                setSelectedGroupIds,
                              )
                            }
                            size="sm"
                            ariaLabel="Select all groups"
                          />
                        </th>
                        <th>Name</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={tableBodyClass}>
                      {visibleGroups.map((group) => (
                        <tr key={group._id}>
                          <td className=" w-10">
                            <SelectionToggle
                              checked={selectedGroupIds.has(group._id)}
                              onChange={(next) =>
                                toggleSelectMany([group._id], next, setSelectedGroupIds)
                              }
                              size="sm"
                              ariaLabel={`Select group ${getDisplayName(group)}`}
                            />
                          </td>
                          <td>
                            <button
                              className={`text-left ${
                                selectedGroupId === group._id ? "font-semibold" : ""
                              }`}
                              onClick={() => setSelectedGroupId(group._id)}
                            >
                              {getDisplayName(group)}
                            </button>
                          </td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openRenameModal(group);
                                }}
                              >
                                {t(locale, "categories_rename")}
                              </button>
                              {group.isArchived ? (
                                <button
                                  className="btn btn-ghost btn-xs"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleRestoreGroup(group);
                                  }}
                                >
                                  {t(locale, "categories_restore")}
                                </button>
                              ) : (
                                <button
                                  className="btn btn-ghost btn-xs"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openArchiveGroupModal(group);
                                  }}
                                >
                                  {t(locale, "categories_archive")}
                                </button>
                              )}
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DataTable>
              ) : null}
            </div>
          </div>
        </div>

        <div className={CHIP_CLASS_NO_PADDING}>
          <div className="card-body gap-4">
            {selectedGroupIds.size ? (<div className="alert flex flex-wrap items-center justify-between gap-3"><span>{selectedGroupIds.size} selected</span><div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => void handleBulkGroups("archive")} disabled={isSubmitting}>Archive selected</button>{showArchived ? <button className="btn btn-ghost btn-sm" onClick={() => void handleBulkGroups("unarchive")} disabled={isSubmitting}>Unarchive selected</button> : null}<button className="btn btn-ghost btn-sm text-error" onClick={() => void handleBulkGroups("delete")} disabled={isSubmitting}>Delete selected</button></div></div>) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t(locale, "categories_title")}</h2>{selectedCategoryIds.size ? (<div className="alert flex flex-wrap items-center justify-between gap-3 mt-2"><span>{selectedCategoryIds.size} selected</span><div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => void handleBulkCategories("archive")} disabled={isSubmitting}>Archive selected</button>{showArchived ? <button className="btn btn-ghost btn-sm" onClick={() => void handleBulkCategories("unarchive")} disabled={isSubmitting}>Unarchive selected</button> : null}<button className="btn btn-ghost btn-sm text-error" onClick={() => void handleBulkCategories("delete")} disabled={isSubmitting}>Delete selected</button></div></div>) : null}
              <button
                className={addButtonClass}
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
              <DataTable>
                <table className={tableBaseClass}>
                  <thead className={tableHeadClass}>
                    <tr>
                      <th><SelectionToggle checked={activeCategoriesForGroup.length > 0 && activeCategoriesForGroup.every((category) => selectedCategoryIds.has(category._id))} onChange={(next) => toggleSelectMany(activeCategoriesForGroup.map((category) => category._id), next, setSelectedCategoryIds)} size="sm" ariaLabel="Select all categories" /></th>
                      <th>{t(locale, "categories_name")}</th>
                      <th>{t(locale, "categories_kind")}</th>
                      <th className="text-right">{t(locale, "categories_actions")}</th>
                    </tr>
                  </thead>
                  <tbody className={tableBodyClass}>
                    {activeCategoriesForGroup.map((category) => (
                      <tr key={category._id}>
                        <td><SelectionToggle checked={selectedCategoryIds.has(category._id)} onChange={(next) => toggleSelectMany([category._id], next, setSelectedCategoryIds)} size="sm" ariaLabel={`Select ${getCategoryLabel(category)}`} /></td>
                        <td className=" font-medium">{getCategoryLabel(category)}</td>
                        <td>
                          <span className="badge badge-outline">
                            {kindLabels[normalizeKind(category.kind)]}
                          </span>
                        </td>
                        <td className=" text-right">
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
              </DataTable>
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
                  <DataTable>
                    <table className={tableBaseClass}>
                      <thead className={tableHeadClass}>
                        <tr>
                          <th><SelectionToggle checked={archivedCategoriesForGroup.length > 0 && archivedCategoriesForGroup.every((category) => selectedCategoryIds.has(category._id))} onChange={(next) => toggleSelectMany(archivedCategoriesForGroup.map((category) => category._id), next, setSelectedCategoryIds)} size="sm" ariaLabel="Select all archived categories" /></th>
                          <th>{t(locale, "categories_name")}</th>
                          <th>{t(locale, "categories_kind")}</th>
                          <th className="text-right">{t(locale, "categories_actions")}</th>
                        </tr>
                      </thead>
                      <tbody className={tableBodyClass}>
                        {archivedCategoriesForGroup.map((category) => (
                          <tr key={category._id}>
                            <td><SelectionToggle checked={selectedCategoryIds.has(category._id)} onChange={(next) => toggleSelectMany([category._id], next, setSelectedCategoryIds)} size="sm" ariaLabel={`Select ${getCategoryLabel(category)}`} /></td>
                            <td className=" font-medium">{getCategoryLabel(category)}</td>
                            <td>
                              <span className="badge badge-outline">
                                {kindLabels[normalizeKind(category.kind)]}
                              </span>
                            </td>
                            <td className=" text-right">
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
                  </DataTable>
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
            <span className="label-text mb-1 text-sm font-medium">{t(locale, "categories_emoji_label")}</span>
            <EmojiPickerPopover value={newCategoryEmoji} onChange={setNewCategoryEmoji} />
          </label>
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
              onChange={(event) => setNewCategoryKind(event.target.value as CategoryFormKind)}
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
            <span className="label-text mb-1 text-sm font-medium">{t(locale, "categories_emoji_label")}</span>
            <EmojiPickerPopover value={editCategoryEmoji} onChange={setEditCategoryEmoji} />
          </label>
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
              onChange={(event) => setEditCategoryKind(event.target.value as CategoryFormKind)}
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
        onClose={() => {
          setDeleteCategoryOpen(false);
          setDeleteCategoryReferences(null);
          setDeleteCategoryMessage(null);
        }}
      >
        <div className="space-y-4">
          {deleteCategoryReferences ? (
            <>
              <p className="text-sm opacity-70">
                {deleteCategoryMessage ??
                  "This category is currently in use. Deleting anyway will apply the changes below:"}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm opacity-80">
                <li>
                  referenced by {deleteCategoryReferences.transactionCount} transactions → will
                  become “Uncategorized”
                </li>
                <li>
                  referenced by
                  {" "}
                  {deleteCategoryReferences.budgetActiveCount +
                    deleteCategoryReferences.budgetArchivedCount}
                  {" "}
                  budgets → removed from budgets
                </li>
                <li>
                  referenced by {deleteCategoryReferences.budgetMonthCount} budget-month planned
                  lines → removed from month budgets
                </li>
              </ul>
            </>
          ) : (
            <p className="text-sm opacity-70">
              {t(locale, "categories_delete_category_body")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setDeleteCategoryOpen(false);
                setDeleteCategoryReferences(null);
                setDeleteCategoryMessage(null);
              }}
            >
              {t(locale, "categories_cancel")}
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleDeleteCategory}>
              {deleteCategoryReferences
                ? "Delete anyway"
                : t(locale, "categories_delete_permanently")}
            </SubmitButton>
          </div>
        </div>
      </Modal>
    </section>
  );
}
