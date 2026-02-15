"use client";

import { useMemo, useState } from "react";
import { SelectionToggle } from "@/components/ui/SelectionToggle";

type Option = {
  id: string;
  label: string;
  color?: string | null;
};

type MultiSelectDropDownProps = {
  options?: Option[];
  selectedIds?: string[];
  onChange?: (nextIds: string[]) => void;
  placeholder?: string;
  mode?: "options" | "custom";
  customPanel?: React.ReactNode;
  buttonLabel?: string;
  onClear?: () => void;
  grouped?: boolean;
  groups?: Array<{ id: string; label: string }>;
  groupIdByOption?: Record<string, string | null | undefined>;
};

export function MultiSelectDropDown({
  options = [],
  selectedIds = [],
  onChange,
  placeholder = "Select",
  mode = "options",
  customPanel,
  buttonLabel,
  onClear,
  grouped = false,
  groups = [],
  groupIdByOption,
}: MultiSelectDropDownProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((item) => item.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const selectedItems = useMemo(
    () => options.filter((item) => selectedSet.has(item.id)),
    [options, selectedSet]
  );

  const groupedItems = useMemo(() => {
    if (!grouped) return [];

    const groupedById = new Map<string, Option[]>();
    groups.forEach((group) => {
      groupedById.set(group.id, []);
    });

    const ungrouped: Option[] = [];

    filteredItems.forEach((item) => {
      const groupId = groupIdByOption?.[item.id];
      if (groupId && groupedById.has(groupId)) {
        groupedById.get(groupId)?.push(item);
        return;
      }
      ungrouped.push(item);
    });

    return groups
      .map((group) => ({ id: group.id, label: group.label, options: groupedById.get(group.id) ?? [] }))
      .filter((group) => group.options.length > 0)
      .concat(ungrouped.length > 0 ? [{ id: "__ungrouped", label: "Ungrouped", options: ungrouped }] : []);
  }, [filteredItems, grouped, groupIdByOption, groups]);

  const toggleSelection = (id: string) => {
    if (!onChange) return;
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  return (
    <div
      className={`dropdown dropdown-bottom w-full ${open ? "dropdown-open" : ""}`}
      tabIndex={0}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <div
        className="btn btn-outline w-full justify-between min-h-10 h-10"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
      >
        {buttonLabel ? (
          <span className="truncate">{buttonLabel}</span>
        ) : selectedItems.length === 0 ? (
          <span className="opacity-60">{placeholder}</span>
        ) : selectedItems.length <= 2 ? (
          <div className="flex flex-wrap gap-1">
            {selectedItems.map((item) => (
              <span key={item.id} className="badge badge-sm badge-outline gap-1">
                {item.color ? (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                ) : null}
                {item.label}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm">{selectedItems.length} selected</span>
        )}
        {onClear ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs ml-auto"
            onClick={(event) => {
              event.stopPropagation();
              onClear();
              setOpen(false);
            }}
          >
            Clear
          </button>
        ) : null}
        <span className="text-xs opacity-60">▾</span>
      </div>
      <div className="dropdown-content z-[50] mt-2 rounded-xl border border-base-200 bg-white p-2 shadow-lg w-full max-h-80 overflow-y-auto overflow-x-hidden">
        {mode === "custom" ? (
          customPanel
        ) : (
          <>
            <input
              className="input input-sm input-bordered w-full mb-2"
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {grouped
              ? groupedItems.map((group) => (
                  <div key={group.id}>
                    <div className="px-3 pt-3 text-xs font-bold opacity-70">{group.label}</div>
                    {group.options.map((item) => (
                      <label
                        key={item.id}
                        className="label cursor-pointer justify-start gap-2 rounded-md px-2 py-1"
                      >
                        <SelectionToggle
                          checked={selectedSet.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          size="sm"
                          ariaLabel={`Select ${item.label}`}
                        />
                        {item.color ? (
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                        ) : null}
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                ))
              : filteredItems.map((item) => (
                  <label
                    key={item.id}
                    className="label cursor-pointer justify-start gap-2 rounded-md px-2 py-1"
                  >
                    <SelectionToggle
                      checked={selectedSet.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      size="sm"
                      ariaLabel={`Select ${item.label}`}
                    />
                    {item.color ? (
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    ) : null}
                    <span>{item.label}</span>
                  </label>
                ))}
          </>
        )}
      </div>
    </div>
  );
}
