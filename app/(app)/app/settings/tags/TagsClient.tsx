"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { delJSON, getJSON, postJSON, putJSON } from "@/src/lib/apiClient";
import type { Locale } from "@/src/i18n/messages";
import type { Tag } from "@/src/types/tag";

type ApiListResponse<T> = { data: T[] };
type ApiItemResponse<T> = { data: T };

type DeleteResponse = { data: { deleted: boolean } };

export function TagsClient({ locale }: { locale: Locale }) {
  void locale;
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#64748b");

  const activeTags = useMemo(() => tags.filter((tag) => !tag.archivedAt), [tags]);
  const archivedTags = useMemo(() => tags.filter((tag) => tag.archivedAt), [tags]);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getJSON<ApiListResponse<Tag>>("/api/tags?includeArchived=true");
      setTags(response.data);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to load tags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  const openAdd = () => {
    setEditingTag(null);
    setEditName("");
    setEditColor("#64748b");
    setEditOpen(true);
  };

  const openEdit = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color || "#64748b");
    setEditOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editName.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = { name: editName.trim(), color: editColor || null };
      if (editingTag) {
        await putJSON<ApiItemResponse<Tag>>(`/api/tags/${editingTag._id}`, payload);
      } else {
        await postJSON<ApiItemResponse<Tag>>("/api/tags", payload);
      }
      setEditOpen(false);
      setEditingTag(null);
      await loadTags();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to save tag");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setArchived = async (tag: Tag, archived: boolean) => {
    setIsSubmitting(true);
    try {
      await putJSON<ApiItemResponse<Tag>>(`/api/tags/${tag._id}`, { isArchived: archived });
      await loadTags();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to update tag");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTag = async (tag: Tag) => {
    setIsSubmitting(true);
    try {
      await delJSON<DeleteResponse>(`/api/tags/${tag._id}?hard=1`);
      await loadTags();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to delete tag");
    } finally {
      setIsSubmitting(false);
    }
  };

  const rows = showArchived ? tags : activeTags;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Tags" subtitle="Manage transaction tags" />
        <div className="flex items-center gap-3">
          <button className="btn btn-primary btn-sm" onClick={openAdd}>Add tag</button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="toggle toggle-sm" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        </div>
      </div>
      {toast ? <div className="alert alert-error">{toast}</div> : null}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          {loading ? <p className="text-sm opacity-70">Loading…</p> : null}
          <table className="table">
            <thead><tr><th>Name</th><th>Color</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((tag) => (
                <tr key={tag._id}>
                  <td>{tag.name}</td>
                  <td><span className="inline-block h-4 w-4 rounded-full border" style={{ backgroundColor: tag.color || "transparent" }} /></td>
                  <td className="space-x-2">
                    <button className="btn btn-ghost btn-xs" onClick={() => openEdit(tag)}>Edit</button>
                    {tag.archivedAt ? (
                      <button className="btn btn-ghost btn-xs" onClick={() => void setArchived(tag, false)}>Unarchive</button>
                    ) : (
                      <button className="btn btn-ghost btn-xs" onClick={() => void setArchived(tag, true)}>Archive</button>
                    )}
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => void deleteTag(tag)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {showArchived && archivedTags.length === 0 ? <p className="text-sm opacity-70">No archived tags.</p> : null}
        </div>
      </div>

      <Modal open={editOpen} title={editingTag ? "Edit tag" : "Add tag"} onClose={() => setEditOpen(false)}>
        <form className="space-y-3" onSubmit={handleSave}>
          <TextField id="tag-name" label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <TextField id="tag-color" label="Color" type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
          <div className="flex justify-end">
            <SubmitButton isLoading={isSubmitting}>{editingTag ? "Save" : "Add"}</SubmitButton>
          </div>
        </form>
      </Modal>
    </section>
  );
}
