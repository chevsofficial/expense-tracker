"use client";

import { MultiSelectDropDown } from "@/components/shared/MultiSelectDropDown";

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

export function MultiSelectDropdown({ items, selectedIds, onChange, placeholder }: MultiSelectDropdownProps) {
  return (
    <MultiSelectDropDown
      options={items}
      selectedIds={selectedIds}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

