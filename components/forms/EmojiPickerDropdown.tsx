"use client";

import { useMemo, useState } from "react";

const EMOJI_OPTIONS = [
  "🍔","🛒","🏠","🚗","✈️","🍿","🎓","💊","💼","💳","🎁","🧾","🛍️","🍕","☕","🧃","🏋️","🐶","👶","📦","💡","📱","🧰","🎮",
];

type EmojiPickerDropdownProps = {
  value: string;
  onChange: (value: string) => void;
};

export function EmojiPickerDropdown({ value, onChange }: EmojiPickerDropdownProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim();
    if (!normalized) return EMOJI_OPTIONS;
    return EMOJI_OPTIONS.filter((emoji) => emoji.includes(normalized));
  }, [query]);

  return (
    <div
      className={`dropdown dropdown-bottom ${open ? "dropdown-open" : ""}`}
      tabIndex={0}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <button type="button" className="btn btn-sm btn-outline bg-base-100" onClick={() => setOpen((v) => !v)}>
        {value || "Pick emoji"}
      </button>
      <div className="dropdown-content p-2 border bg-base-100 rounded-box shadow w-80 z-[50] space-y-2">
        <input
          className="input input-sm input-bordered w-full"
          placeholder="Search emoji"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="grid grid-cols-8 gap-1 max-h-56 overflow-auto">
          {filtered.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                onChange(emoji);
                setOpen(false);
                setQuery("");
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
