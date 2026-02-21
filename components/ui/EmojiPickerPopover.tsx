"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type EmojiEntry = { emoji: string; keywords: string[] };

type EmojiCategory = { id: string; label: string; emojis: EmojiEntry[] };

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: [
      { emoji: "😀", keywords: ["grinning", "happy", "smile"] },
      { emoji: "😃", keywords: ["smile", "happy", "joy"] },
      { emoji: "😄", keywords: ["smile", "laugh"] },
      { emoji: "😁", keywords: ["beam", "grin"] },
      { emoji: "😆", keywords: ["laugh", "happy"] },
      { emoji: "😂", keywords: ["tears", "laugh"] },
      { emoji: "🤣", keywords: ["rofl", "laugh"] },
      { emoji: "😊", keywords: ["blush", "smile"] },
      { emoji: "🙂", keywords: ["slight", "smile"] },
      { emoji: "😉", keywords: ["wink"] },
      { emoji: "😍", keywords: ["love", "heart", "eyes"] },
      { emoji: "😘", keywords: ["kiss", "love"] },
      { emoji: "😋", keywords: ["yum", "tongue"] },
      { emoji: "😎", keywords: ["cool", "sunglasses"] },
      { emoji: "🤩", keywords: ["star", "eyes"] },
      { emoji: "🥳", keywords: ["party", "celebration"] },
      { emoji: "😴", keywords: ["sleep", "tired"] },
      { emoji: "🤗", keywords: ["hug"] },
      { emoji: "🤔", keywords: ["thinking"] },
      { emoji: "🙌", keywords: ["raise", "hands"] },
      { emoji: "👏", keywords: ["clap", "applause"] },
      { emoji: "👍", keywords: ["thumbs", "up", "ok"] },
      { emoji: "👎", keywords: ["thumbs", "down"] },
      { emoji: "❤️", keywords: ["heart", "love"] },
      { emoji: "💔", keywords: ["broken", "heart"] },
      { emoji: "🔥", keywords: ["fire", "lit"] },
      { emoji: "✨", keywords: ["sparkles", "magic"] },
      { emoji: "💯", keywords: ["hundred", "perfect"] },
      { emoji: "😭", keywords: ["cry", "sad"] },
      { emoji: "😡", keywords: ["angry", "mad"] },
    ],
  },
  {
    id: "people",
    label: "People",
    emojis: [
      { emoji: "👋", keywords: ["wave", "hello"] },
      { emoji: "🤝", keywords: ["handshake", "deal"] },
      { emoji: "🙏", keywords: ["pray", "thanks"] },
      { emoji: "💪", keywords: ["muscle", "strength"] },
      { emoji: "🧠", keywords: ["brain", "think"] },
      { emoji: "👀", keywords: ["eyes", "watch"] },
      { emoji: "🫶", keywords: ["heart", "hands"] },
      { emoji: "👶", keywords: ["baby", "child"] },
      { emoji: "🧑", keywords: ["person"] },
      { emoji: "👩", keywords: ["woman"] },
      { emoji: "👨", keywords: ["man"] },
      { emoji: "👵", keywords: ["old", "woman"] },
      { emoji: "👴", keywords: ["old", "man"] },
      { emoji: "🧑‍💻", keywords: ["developer", "computer"] },
      { emoji: "🧑‍🍳", keywords: ["cook", "chef"] },
      { emoji: "🧑‍🏫", keywords: ["teacher", "school"] },
      { emoji: "🧑‍🔧", keywords: ["mechanic", "tools"] },
      { emoji: "🧑‍🎓", keywords: ["student", "graduate"] },
      { emoji: "🧑‍⚕️", keywords: ["doctor", "health"] },
      { emoji: "👨‍👩‍👧", keywords: ["family", "parents"] },
    ],
  },
  {
    id: "food",
    label: "Food",
    emojis: [
      { emoji: "🍎", keywords: ["apple", "fruit"] },
      { emoji: "🍌", keywords: ["banana", "fruit"] },
      { emoji: "🍓", keywords: ["strawberry", "fruit"] },
      { emoji: "🍇", keywords: ["grape", "fruit"] },
      { emoji: "🥑", keywords: ["avocado", "healthy"] },
      { emoji: "🥗", keywords: ["salad", "healthy"] },
      { emoji: "🍞", keywords: ["bread", "bakery"] },
      { emoji: "🧀", keywords: ["cheese", "dairy"] },
      { emoji: "🥚", keywords: ["egg", "breakfast"] },
      { emoji: "🍳", keywords: ["cooking", "breakfast"] },
      { emoji: "🍔", keywords: ["burger", "fastfood"] },
      { emoji: "🍟", keywords: ["fries", "fastfood"] },
      { emoji: "🍕", keywords: ["pizza", "dinner"] },
      { emoji: "🌮", keywords: ["taco", "mexican"] },
      { emoji: "🌯", keywords: ["burrito", "mexican"] },
      { emoji: "🍣", keywords: ["sushi", "japanese"] },
      { emoji: "🍜", keywords: ["ramen", "noodles"] },
      { emoji: "🍰", keywords: ["cake", "dessert"] },
      { emoji: "🍩", keywords: ["donut", "dessert"] },
      { emoji: "🍪", keywords: ["cookie", "dessert"] },
      { emoji: "☕", keywords: ["coffee", "drink"] },
      { emoji: "🫖", keywords: ["tea", "drink"] },
      { emoji: "🍺", keywords: ["beer", "drink"] },
      { emoji: "🍷", keywords: ["wine", "drink"] },
      { emoji: "🥤", keywords: ["soda", "drink"] },
      { emoji: "🧃", keywords: ["juice", "drink"] },
    ],
  },
  {
    id: "travel",
    label: "Travel",
    emojis: [
      { emoji: "🚗", keywords: ["car", "drive"] },
      { emoji: "🚕", keywords: ["taxi"] },
      { emoji: "🚌", keywords: ["bus", "transport"] },
      { emoji: "🚆", keywords: ["train", "transport"] },
      { emoji: "✈️", keywords: ["plane", "flight"] },
      { emoji: "🚢", keywords: ["ship", "boat"] },
      { emoji: "🚲", keywords: ["bike", "cycling"] },
      { emoji: "🛴", keywords: ["scooter"] },
      { emoji: "⛽", keywords: ["fuel", "gas"] },
      { emoji: "🗺️", keywords: ["map", "travel"] },
      { emoji: "🏠", keywords: ["home", "house"] },
      { emoji: "🏢", keywords: ["office", "building"] },
      { emoji: "🏦", keywords: ["bank", "finance"] },
      { emoji: "🏥", keywords: ["hospital", "health"] },
      { emoji: "🏫", keywords: ["school", "education"] },
      { emoji: "🛒", keywords: ["shopping", "cart"] },
      { emoji: "🛍️", keywords: ["shopping", "bags"] },
      { emoji: "🏖️", keywords: ["beach", "vacation"] },
      { emoji: "🏕️", keywords: ["camping", "nature"] },
      { emoji: "💼", keywords: ["briefcase", "work"] },
    ],
  },
  {
    id: "objects",
    label: "Objects",
    emojis: [
      { emoji: "💡", keywords: ["idea", "light"] },
      { emoji: "📱", keywords: ["phone", "mobile"] },
      { emoji: "💻", keywords: ["laptop", "computer"] },
      { emoji: "⌚", keywords: ["watch", "time"] },
      { emoji: "📷", keywords: ["camera", "photo"] },
      { emoji: "🎧", keywords: ["music", "headphones"] },
      { emoji: "📦", keywords: ["package", "delivery"] },
      { emoji: "🧾", keywords: ["receipt", "invoice"] },
      { emoji: "💳", keywords: ["card", "payment"] },
      { emoji: "🪙", keywords: ["coin", "money"] },
      { emoji: "💸", keywords: ["money", "cash"] },
      { emoji: "💰", keywords: ["money", "bag"] },
      { emoji: "🛠️", keywords: ["tools", "repair"] },
      { emoji: "🔒", keywords: ["lock", "secure"] },
      { emoji: "🔑", keywords: ["key", "access"] },
      { emoji: "📌", keywords: ["pin", "office"] },
      { emoji: "🗂️", keywords: ["files", "folder"] },
      { emoji: "📝", keywords: ["notes", "write"] },
      { emoji: "📊", keywords: ["chart", "analytics"] },
      { emoji: "📈", keywords: ["growth", "chart"] },
      { emoji: "📉", keywords: ["decline", "chart"] },
    ],
  },
  {
    id: "nature",
    label: "Nature",
    emojis: [
      { emoji: "🌳", keywords: ["tree", "nature"] },
      { emoji: "🌴", keywords: ["palm", "tree"] },
      { emoji: "🌵", keywords: ["cactus", "desert"] },
      { emoji: "🌸", keywords: ["flower", "blossom"] },
      { emoji: "🌞", keywords: ["sun", "weather"] },
      { emoji: "🌧️", keywords: ["rain", "weather"] },
      { emoji: "⛈️", keywords: ["storm", "weather"] },
      { emoji: "❄️", keywords: ["snow", "winter"] },
      { emoji: "🌊", keywords: ["wave", "water"] },
      { emoji: "🐶", keywords: ["dog", "pet"] },
      { emoji: "🐱", keywords: ["cat", "pet"] },
      { emoji: "🐼", keywords: ["panda", "animal"] },
      { emoji: "🦊", keywords: ["fox", "animal"] },
      { emoji: "🐸", keywords: ["frog", "animal"] },
      { emoji: "🐝", keywords: ["bee", "insect"] },
      { emoji: "🦋", keywords: ["butterfly", "insect"] },
      { emoji: "🐢", keywords: ["turtle", "animal"] },
      { emoji: "🐟", keywords: ["fish", "sea"] },
      { emoji: "🦖", keywords: ["dinosaur", "animal"] },
      { emoji: "🪴", keywords: ["plant", "home"] },
    ],
  },
];

type EmojiPickerPopoverProps = {
  value: string;
  onChange: (emoji: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EmojiPickerPopover({ value, onChange, open, onOpenChange }: EmojiPickerPopoverProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);


  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popupRef.current?.contains(target) || toggleRef.current?.contains(target)) {
        return;
      }
      setQuery("");
      onOpenChange(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onOpenChange]);

  const visibleCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return EMOJI_CATEGORIES.filter((category) => category.id === activeCategory);
    }

    return EMOJI_CATEGORIES.map((category) => ({
      ...category,
      emojis: category.emojis.filter((entry) =>
        entry.emoji.includes(normalized) || entry.keywords.some((keyword) => keyword.includes(normalized))
      ),
    })).filter((category) => category.emojis.length > 0);
  }, [activeCategory, query]);

  return (
    <div className="relative flex items-center gap-2">
      <button
        ref={toggleRef}
        type="button"
        className="btn btn-ghost btn-sm border border-neutral-300 bg-white"
        onClick={() => {
          if (open) {
            setQuery("");
          }
          onOpenChange(!open);
        }}
        aria-label="Pick emoji"
      >
        <span className="text-lg">{value || "😊"}</span>
      </button>

      {open ? (
        <div
          ref={popupRef}
          className="absolute left-0 top-full z-[60] mt-2 w-[min(42rem,85vw)] rounded-xl border border-neutral-300 bg-white p-3 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <input
              className="input input-sm input-bordered w-full"
              placeholder="Search emoji"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => {
                setQuery("");
                onOpenChange(false);
              }}
            >
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

          <div className="max-h-[320px] overflow-y-auto">
            {visibleCategories.map((category) => (
              <div key={category.id} className="mb-4 last:mb-0">
                {query ? <p className="mb-2 text-xs font-semibold uppercase opacity-60">{category.label}</p> : null}
                <div className="grid grid-cols-10 gap-1">
                  {category.emojis.map((entry) => (
                    <button
                      key={`${category.id}-${entry.emoji}`}
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        onChange(entry.emoji);
                        setQuery("");
                        onOpenChange(false);
                      }}
                    >
                      {entry.emoji}
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
      ) : null}
    </div>
  );
}
