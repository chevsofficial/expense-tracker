"use client";

type RecurringActionsProps = {
  isArchived: boolean;
  onEdit: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete: () => void;
  labels: {
    edit: string;
    archive: string;
    restore: string;
    delete: string;
  };
};

export function RecurringActions({ isArchived, onEdit, onArchive, onRestore, onDelete, labels }: RecurringActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn btn-xs" type="button" onClick={onEdit}>
        {labels.edit}
      </button>
      {isArchived ? (
        <button className="btn btn-ghost btn-xs" type="button" onClick={onRestore}>
          {labels.restore}
        </button>
      ) : (
        <button className="btn btn-ghost btn-xs" type="button" onClick={onArchive}>
          {labels.archive}
        </button>
      )}
      <button className="btn btn-ghost btn-xs" type="button" onClick={onDelete}>
        {labels.delete}
      </button>
    </div>
  );
}
