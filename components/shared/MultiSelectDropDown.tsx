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
      <div className="dropdown-content z-[50] menu p-2 shadow bg-base-100 rounded-box w-full border border-base-200 max-h-72 overflow-auto">
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
            {filteredItems.map((item) => (
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
