"use client";

import { useMemo, useState } from "react";

type MultiSelectItem = {
  id: string;
  label: string;
  color?: string | null;
};

type MultiSelectDropdownProps = {
  items: MultiSelectItem[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  placeholder?: string;
};

export function MultiSelectDropdown({
  items,
  selectedIds,
  onChange,
  placeholder = "Select tags…",
}: MultiSelectDropdownProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((item) => item.label.toLowerCase().includes(normalizedQuery));
  }, [items, query]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedSet.has(item.id)),
    [items, selectedSet]
  );

  const toggleSelection = (id: string) => {
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
        className="input input-bordered bg-base-100 flex min-h-10 w-full items-center gap-2 px-3"
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
        {selectedItems.length === 0 ? (
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
        <span className="ml-auto text-xs opacity-60">▾</span>
      </div>
      <div className="dropdown-content z-[50] menu p-2 shadow bg-base-100 rounded-box w-full border border-base-200 max-h-72 overflow-auto">
        <input
          className="input input-sm input-bordered w-full mb-2"
          placeholder="Search tags..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {filteredItems.map((item) => (
          <label key={item.id} className="label cursor-pointer justify-start gap-2 rounded-md px-2 py-1">
            <input
              type="checkbox"
              className="checkbox checkbox-sm rounded-lg border-2 border-black bg-white checked:bg-primary checked:border-primary checked:checkbox-success"
              checked={selectedSet.has(item.id)}
              onChange={() => toggleSelection(item.id)}
            />
            {item.color ? (
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            ) : null}
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
