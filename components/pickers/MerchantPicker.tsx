"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

export type MerchantPickerMerchant = {
  _id: string;
  name: string;
  isArchived?: boolean;
};

type MerchantPickerProps = {
  locale: Locale;
  merchants: MerchantPickerMerchant[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  creating?: boolean;
  loading?: boolean;
  onCreateMerchant?: (name: string) => Promise<MerchantPickerMerchant | null>;
  onLoadMerchants?: () => void;
  showManageLink?: boolean;
};

export function MerchantPicker({
  locale,
  merchants,
  value,
  onChange,
  placeholder,
  disabled,
  allowCreate,
  allowEmpty,
  emptyLabel,
  creating,
  loading,
  onCreateMerchant,
  onLoadMerchants,
  showManageLink = true,
}: MerchantPickerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localCreating, setLocalCreating] = useState(false);

  const effectiveCreating = creating ?? localCreating;

  const merchantMap = useMemo(() => {
    const map = new Map<string, string>();
    merchants.forEach((merchant) => {
      map.set(merchant._id, merchant.name);
    });
    return map;
  }, [merchants]);

  const merchantMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return merchants;
    return merchants.filter((merchant) => merchant.name.toLowerCase().includes(normalizedQuery));
  }, [merchants, query]);

  const selectedMerchantLabel = useMemo(() => {
    if (!value) return "";
    return merchantMap.get(value) || "";
  }, [merchantMap, value]);

  const emptyLabelText = emptyLabel ?? t(locale, "transactions_filter_any");
  const displayLabel = selectedMerchantLabel || placeholder || emptyLabelText;

  const handleCreate = async () => {
    if (!onCreateMerchant) return;
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return;
    if (creating === undefined) {
      setLocalCreating(true);
    }
    const created = await onCreateMerchant(trimmedQuery);
    if (creating === undefined) {
      setLocalCreating(false);
    }
    if (created) {
      onChange(created._id);
      setDropdownOpen(false);
      setQuery("");
    }
  };

  return (
    <div
      className={`dropdown w-full ${dropdownOpen ? "dropdown-open" : ""}`}
      tabIndex={0}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDropdownOpen(false);
          setQuery("");
        }
      }}
    >
      <button
        type="button"
        className="input input-bordered flex w-full items-center justify-between text-left"
        onClick={() => {
          if (disabled) return;
          setDropdownOpen(true);
          setQuery("");
          if (!merchants.length && !loading && onLoadMerchants) {
            onLoadMerchants();
          }
        }}
        disabled={disabled}
      >
        <span className={selectedMerchantLabel ? "" : "opacity-60"}>{displayLabel}</span>
        <span className="text-xs opacity-60">▾</span>
      </button>
      <div className="menu dropdown-content w-full rounded-box bg-base-100 p-2 shadow">
        <input
          className="input input-sm input-bordered w-full"
          placeholder={t(locale, "transactions_merchant_placeholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={disabled}
        />
        <div className="mt-2 max-h-56 overflow-y-auto">
          {loading ? (
            <div className="px-2 py-2 text-sm opacity-60">{t(locale, "merchants_loading")}</div>
          ) : merchantMatches.length ? (
            <ul className="space-y-1">
              {allowEmpty ? (
                <li>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1 text-left text-sm hover:bg-base-200"
                    onClick={() => {
                      onChange("");
                      setDropdownOpen(false);
                      setQuery("");
                    }}
                  >
                    {emptyLabelText}
                  </button>
                </li>
              ) : null}
              {merchantMatches.map((merchant) => (
                <li key={merchant._id}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1 text-left text-sm hover:bg-base-200"
                    onClick={() => {
                      onChange(merchant._id);
                      setDropdownOpen(false);
                      setQuery("");
                    }}
                  >
                    {merchant.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2 px-2 py-2 text-sm">
              {allowEmpty ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs w-full justify-start"
                  onClick={() => {
                    onChange("");
                    setDropdownOpen(false);
                    setQuery("");
                  }}
                >
                  {emptyLabelText}
                </button>
              ) : null}
              <p className="opacity-60">{t(locale, "transactions_no_merchants")}</p>
              {allowCreate && query.trim() ? (
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={handleCreate}
                  disabled={effectiveCreating || query.trim().length < 2}
                >
                  {t(locale, "transactions_create_merchant")} “{query.trim()}”
                </button>
              ) : null}
            </div>
          )}
        </div>
        {showManageLink ? (
          <div className="mt-2 border-t border-base-200 pt-2">
            <button
              type="button"
              className="btn btn-ghost btn-xs w-full justify-start"
              onClick={() => {
                setDropdownOpen(false);
                setQuery("");
                router.push("/app/settings/merchants");
              }}
            >
              {t(locale, "transactions_manage_merchants")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
