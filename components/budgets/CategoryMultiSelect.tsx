"use client";

import type { Category } from "@/src/types/category";

type CategoryGroup = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  isArchived?: boolean;
};

type CategoryMultiSelectProps = {
  categories: Category[];
  groups: CategoryGroup[];
  selectedIds: string[];
  allSelected: boolean;
  onToggleCategory: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  label: string;
  allLabel: string;
};

export function CategoryMultiSelect({
  categories,
  groups,
  selectedIds,
  allSelected,
  onToggleCategory,
  onToggleAll,
  label,
  allLabel,
}: CategoryMultiSelectProps) {
  const groupMap = new Map(groups.map((group) => [group._id, group]));

  const grouped = categories.reduce<Record<string, Category[]>>((acc, category) => {
    if (!category.groupId) return acc;
    acc[category.groupId] = acc[category.groupId] ?? [];
    acc[category.groupId].push(category);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="checkbox checkbox-primary checkbox-sm"
            checked={allSelected}
            onChange={(event) => onToggleAll(event.target.checked)}
          />
          {allLabel}
        </label>
      </div>
      {allSelected ? (
        <p className="text-xs opacity-60">{allLabel}</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([groupId, groupCategories]) => {
            const group = groupMap.get(groupId);
            const groupLabel = group?.nameCustom?.trim() || group?.nameKey || "Group";
            return (
              <div key={groupId} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                  {groupLabel}
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {groupCategories.map((category) => (
                    <button
                      key={category._id}
                      type="button"
                      className="flex items-center gap-2 rounded-lg border border-base-200 bg-base-100 px-3 py-2 text-left text-sm"
                      onClick={() => onToggleCategory(category._id)}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                          selectedIds.includes(category._id)
                            ? "border-primary bg-primary text-primary-content"
                            : "border-base-300 bg-base-100 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span>
                        {category.emoji ? `${category.emoji} ` : ""}
                        {category.nameCustom?.trim() || category.nameKey || "Category"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
