"use client";

type BudgetColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
};

const PRESET_COLORS = [
  "#2563eb",
  "#1d4ed8",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#84cc16",
  "#f97316",
  "#f43f5e",
  "#a855f7",
  "#64748b",
  "#111827",
  "#e2e8f0",
];

export function BudgetColorPicker({ value, onChange, label }: BudgetColorPickerProps) {
  return (
    <label className="form-control w-full">
      <span className="label-text mb-1 text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_COLORS.map((color) => {
          const selected = value.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                selected ? "border-neutral" : "border-base-300"
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
              aria-label={`Select ${color}`}
            >
              {selected ? <span className="text-xs text-white drop-shadow">✓</span> : null}
            </button>
          );
        })}
        <label className="flex items-center gap-2 text-xs">
          <span className="rounded-full border border-base-300 bg-base-100 px-2 py-1">
            Custom…
          </span>
          <input
            type="color"
            className="h-8 w-8 cursor-pointer rounded-full border border-base-300"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label="Custom color"
          />
        </label>
      </div>
    </label>
  );
}
