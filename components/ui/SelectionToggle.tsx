"use client";

import React from "react";

type SelectionToggleProps = {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  ariaLabel?: string;
  className?: string;
};

export function SelectionToggle({
  checked,
  onChange,
  disabled = false,
  size = "md",
  ariaLabel = "Select",
  className = "",
}: SelectionToggleProps) {
  const dims = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={[
        "inline-flex items-center justify-center",
        dims,
        "rounded-md",
        "transition-colors",
        "border",                 // thin border (1px)
        checked
          ? "bg-primary border-primary"
          : "bg-white border-neutral-800",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      <span
        className={[
          "text-xs leading-none",
          checked ? "text-white" : "text-transparent",
        ].join(" ")}
      >
        ✓
      </span>
    </button>
  );
}
