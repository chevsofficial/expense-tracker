"use client";

import { useMemo, useState } from "react";

const EMOJI_CATEGORIES: Array<{ id: string; label: string; emojis: string[] }> = [
  { id: "smileys", label: "Smileys", emojis: ["😀","😁","😂","🤣","😊","😍","😘","😎","🤩","😭","😡","🤯","🥳","😴","🤗","🤔","🙌","👏","👍","👎"] },
  { id: "people", label: "People", emojis: ["👋","🙏","💪","🧠","👀","👶","🧑","👩","👨","👵","👴","🧑‍💻","🧑‍🍳","🧑‍🎓","🧑‍🔧","🧑‍🏫","👨‍👩‍👧","🫶","🤝","🫡"] },
  { id: "food", label: "Food", emojis: ["🍎","🍔","🍕","🌮","🍜","🍣","🍩","🍪","☕","🧃","🍺","🍷","🥗","🥑","🍇","🍓","🍞","🧀","🍳","🍿"] },
  { id: "travel", label: "Travel", emojis: ["🚗","🚕","🚌","🚆","✈️","🚢","🚲","🛴","⛽","🗺️","🏖️","🏕️","🏠","🏢","🏦","🏥","🏫","🛒","🛍️","💼"] },
  { id: "objects", label: "Objects", emojis: ["💡","📱","💻","⌚","📷","🎧","📦","🧾","💳","🛠️","🔒","🔑","🧰","🪙","📌","🗂️","📝","📊","📈","📉"] },
  { id: "nature", label: "Nature", emojis: ["🌳","🌴","🌵","🌸","🌞","🌧️","⛈️","❄️","🔥","🌊","🐶","🐱","🐼","🦊","🐸","🐝","🦋","🐢","🐟","🦖"] },
];

type EmojiPickerPopoverProps = {
  value: string;
  onChange: (emoji: string) => void;
};

export function EmojiPickerPopover({ value, onChange }: EmojiPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);

  const visibleCategories = useMemo(() => {
    const normalized = query.trim();
    if (!normalized) {
      return EMOJI_CATEGORIES.filter((category) => category.id === activeCategory);
    }

    return EMOJI_CATEGORIES.map((category) => ({
      ...category,
      emojis: category.emojis.filter((emoji) => emoji.includes(normalized)),
    })).filter((category) => category.emojis.length > 0);
  }, [activeCategory, query]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-sm border border-neutral-300 bg-white"
        onClick={() => setOpen(true)}
        aria-label="Pick emoji"
      >
        <span className="text-lg">{value || "😊"}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-xl border border-neutral-300 bg-white p-3 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <input
                className="input input-sm input-bordered w-full"
                placeholder="Search emoji"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {EMOJI_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`btn btn-xs ${activeCategory === category.id && !query ? "btn-neutral" : "btn-ghost"}`}
                  onClick={() => {
                    setActiveCategory(category.id);
                    setQuery("");
                  }}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {visibleCategories.map((category) => (
                <div key={category.id} className="mb-4 last:mb-0">
                  {query ? <p className="mb-2 text-xs font-semibold uppercase opacity-60">{category.label}</p> : null}
                  <div className="grid grid-cols-10 gap-1">
                    {category.emojis.map((emoji) => (
                      <button
                        key={`${category.id}-${emoji}`}
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          onChange(emoji);
                          setOpen(false);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {visibleCategories.length === 0 ? (
                <p className="py-6 text-center text-sm opacity-70">No emoji found.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
