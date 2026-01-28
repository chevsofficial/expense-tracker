"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";

type CategoryGroup = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  isArchived?: boolean;
};

type CategoryKind = "income" | "expense" | "both";

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  groupId: string;
  kind?: CategoryKind;
  isArchived?: boolean;
};

type ApiListResponse<T> = { data: T[] };

type ApiItemResponse<T> = { data: T };

type DeleteResponse = { data: { deleted: boolean } };

const kindOptions: { value: CategoryKind; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "both", label: "Both" },
];

export function CategoriesClient() {
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [renameGroupOpen, setRenameGroupOpen] = useState(false);
  const [groupToRename, setGroupToRename] = useState<CategoryGroup | null>(null);
  const [renameGroupName, setRenameGroupName] = useState("");

  const [archiveGroupOpen, setArchiveGroupOpen] = useState(false);
  const [groupToArchive, setGroupToArchive] = useState<CategoryGroup | null>(null);

  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<CategoryGroup | null>(null);

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

  const selectedGroup = useMemo(
    () => groups.find((group) => group._id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const categoriesForGroup = useMemo(() => {
    if (!selectedGroupId) return [];
    return categories.filter((category) => category.groupId === selectedGroupId);
  }, [categories, selectedGroupId]);

  const getDisplayName = (item: { nameCustom?: string; nameKey?: string }) =>
    item.nameCustom?.trim() || item.nameKey || "Untitled";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [groupResponse, categoryResponse] = await Promise.all([
        getJSON<ApiListResponse<CategoryGroup>>("/api/category-groups"),
        getJSON<ApiListResponse<Category>>("/api/categories"),
      ]);

      const activeGroups = groupResponse.data.filter((group) => !group.isArchived);
      const activeCategories = categoryResponse.data.filter(
        (category) => !category.isArchived
      );

      setGroups(activeGroups);
      setCategories(activeCategories);
      setSelectedGroupId((current) => {
        if (current && activeGroups.some((group) => group._id === current)) {
          return current;
        }
        return activeGroups[0]?._id ?? null;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load categories.";
      setError(message);
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : "Something went wrong.";
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
      await delJSON<DeleteResponse>(`/api/category-groups/${groupToDelete._id}?hard=1`);
      setDeleteGroupOpen(false);
      setGroupToDelete(null);
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
    setDeleteGroupOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setCategoryToEdit(category);
    setEditCategoryName(getDisplayName(category));
    setEditCategoryKind(category.kind ?? "expense");
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

  const openAddCategoryModal = () => {
    if (!selectedGroupId) return;
    setNewCategoryGroupId(selectedGroupId);
    setAddCategoryOpen(true);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="mt-2 opacity-70">Organize categories into clear groups.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => setAddGroupOpen(true)}>
            Add group
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={openAddCategoryModal}
            disabled={!selectedGroupId}
          >
            Add category
          </button>
        </div>
      </div>

      {toast ? (
        <div className="alert alert-error flex items-center justify-between">
          <span>{toast}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setToast(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px,1fr]">
        <div className="card bg-base-100 shadow">
          <div className="card-body gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Groups</h2>
              <button className="btn btn-ghost btn-xs" onClick={() => setAddGroupOpen(true)}>
                Add group
              </button>
            </div>
            {loading ? <p className="text-sm opacity-70">Loading groups...</p> : null}
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <div className="flex flex-col gap-2">
              {groups.length === 0 && !loading ? (
                <p className="text-sm opacity-70">No groups yet.</p>
              ) : null}
              {groups.map((group) => (
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
                      Rename
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        openArchiveGroupModal(group);
                      }}
                    >
                      Archive
                    </button>
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDeleteGroupModal(group);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedGroup ? getDisplayName(selectedGroup) : "Categories"}
                </h2>
                <p className="text-sm opacity-70">
                  {selectedGroup ? "Manage the categories in this group." : ""}
                </p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={openAddCategoryModal}
                disabled={!selectedGroupId}
              >
                Add category
              </button>
            </div>

            {!selectedGroupId ? (
              <div className="rounded-md border border-dashed border-base-300 p-6 text-sm opacity-70">
                Create a group to add categories.
              </div>
            ) : null}

            {selectedGroupId && categoriesForGroup.length === 0 && !loading ? (
              <div className="rounded-md border border-dashed border-base-300 p-6 text-sm opacity-70">
                No categories yet. Add one.
              </div>
            ) : null}

            {selectedGroupId && categoriesForGroup.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Kind</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriesForGroup.map((category) => (
                      <tr key={category._id}>
                        <td className="font-medium">{getDisplayName(category)}</td>
                        <td>
                          <span className="badge badge-outline">
                            {category.kind ?? "expense"}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => openEditCategoryModal(category)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => openArchiveCategoryModal(category)}
                            >
                              Archive
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => openDeleteCategoryModal(category)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Modal open={addGroupOpen} title="Add group" onClose={() => setAddGroupOpen(false)}>
        <form className="space-y-4" onSubmit={handleCreateGroup}>
          <TextField
            id="new-group-name"
            label="Group name"
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            placeholder="e.g. Home"
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setAddGroupOpen(false)}>
              Cancel
            </button>
            <SubmitButton isLoading={isSubmitting}>Create group</SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={renameGroupOpen}
        title="Rename group"
        onClose={() => setRenameGroupOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleRenameGroup}>
          <TextField
            id="rename-group-name"
            label="Group name"
            value={renameGroupName}
            onChange={(event) => setRenameGroupName(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setRenameGroupOpen(false)}
            >
              Cancel
            </button>
            <SubmitButton isLoading={isSubmitting}>Save</SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={archiveGroupOpen}
        title="Archive group?"
        onClose={() => setArchiveGroupOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70">
            This will archive all categories in this group.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setArchiveGroupOpen(false)}
            >
              Cancel
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleArchiveGroup}>
              Archive group
            </SubmitButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteGroupOpen}
        title="Delete group permanently?"
        onClose={() => setDeleteGroupOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70">
            This cannot be undone. We will prevent deletion if the group still has categories.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDeleteGroupOpen(false)}
            >
              Cancel
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleDeleteGroup}>
              Delete permanently
            </SubmitButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={addCategoryOpen}
        title="Add category"
        onClose={() => setAddCategoryOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleCreateCategory}>
          <TextField
            id="new-category-name"
            label="Category name"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="e.g. Groceries"
          />
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">Group</span>
            <select
              className="select select-bordered w-full"
              value={newCategoryGroupId}
              onChange={(event) => setNewCategoryGroupId(event.target.value)}
            >
              {groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {getDisplayName(group)}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">Kind</span>
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
              Cancel
            </button>
            <SubmitButton isLoading={isSubmitting}>Create category</SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={editCategoryOpen}
        title="Edit category"
        onClose={() => setEditCategoryOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleEditCategory}>
          <TextField
            id="edit-category-name"
            label="Category name"
            value={editCategoryName}
            onChange={(event) => setEditCategoryName(event.target.value)}
          />
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">Group</span>
            <select
              className="select select-bordered w-full"
              value={editCategoryGroupId}
              onChange={(event) => setEditCategoryGroupId(event.target.value)}
            >
              {groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {getDisplayName(group)}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium">Kind</span>
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
              Cancel
            </button>
            <SubmitButton isLoading={isSubmitting}>Save</SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={archiveCategoryOpen}
        title="Archive category?"
        onClose={() => setArchiveCategoryOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70">This will archive the category.</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setArchiveCategoryOpen(false)}
            >
              Cancel
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleArchiveCategory}>
              Archive category
            </SubmitButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteCategoryOpen}
        title="Delete category permanently?"
        onClose={() => setDeleteCategoryOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70">
            This cannot be undone. We will prevent deletion if the category is referenced by
            historical data.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDeleteCategoryOpen(false)}
            >
              Cancel
            </button>
            <SubmitButton isLoading={isSubmitting} onClick={handleDeleteCategory}>
              Delete permanently
            </SubmitButton>
          </div>
        </div>
      </Modal>
    </section>
  );
}
