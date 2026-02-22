import { addButtonClass } from "@/components/ui/buttonStyles";

type PageActionsProps = {
  addLabel: string;
  onAdd: () => void;
  showArchived: boolean;
  onToggleArchived: (checked: boolean) => void;
  archivedLabel: string;
  disabled?: boolean;
};

export function PageActions({
  addLabel,
  onAdd,
  showArchived,
  onToggleArchived,
  archivedLabel,
  disabled = false,
}: PageActionsProps) {
  return (
    <div className="flex items-center gap-3 justify-end">
      <button className={addButtonClass} onClick={onAdd} disabled={disabled}>
        {addLabel}
      </button>
      <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <span>{archivedLabel}</span>
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={showArchived}
          onChange={(event) => onToggleArchived(event.target.checked)}
        />
      </label>
    </div>
  );
}
