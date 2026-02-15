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
        "inline-flex items-center justify-center rounded-md",
        dims,
        "bg-white",
        "border border-neutral-300",
        "hover:border-neutral-400",
        "transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        checked ? "bg-primary border-primary" : "",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      {/* Optional: minimal check */}
      <span className={checked ? "text-primary-content text-xs leading-none" : "text-transparent"}>
        ✓
      </span>
    </button>
  );
}
