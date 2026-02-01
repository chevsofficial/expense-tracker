"use client";

import { useMemo } from "react";
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
  merchantsLoading: boolean;
  selectedMerchantId: string | null;
  selectedMerchantName?: string;
  query: string;
  dropdownOpen: boolean;
  creatingMerchant: boolean;
  onDropdownOpenChange: (open: boolean) => void;
  onQueryChange: (value: string) => void;
  onSelectMerchant: (merchant: MerchantPickerMerchant) => void;
  onCreateMerchant: () => void;
  onLoadMerchants: () => void;
};

export function MerchantPicker({
  locale,
  merchants,
  merchantsLoading,
  selectedMerchantId,
  selectedMerchantName,
  query,
  dropdownOpen,
  creatingMerchant,
  onDropdownOpenChange,
  onQueryChange,
  onSelectMerchant,
  onCreateMerchant,
  onLoadMerchants,
}: MerchantPickerProps) {
  const router = useRouter();

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
    if (!selectedMerchantId) return "";
    return selectedMerchantName || merchantMap.get(selectedMerchantId) || "";
  }, [merchantMap, selectedMerchantId, selectedMerchantName]);

  return (
    <div
      className={`dropdown w-full ${dropdownOpen ? "dropdown-open" : ""}`}
      tabIndex={0}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onDropdownOpenChange(false);
          onQueryChange("");
        }
      }}
    >
      <button
        type="button"
        className="input input-bordered flex w-full items-center justify-between text-left"
        onClick={() => {
          onDropdownOpenChange(true);
          onQueryChange("");
          if (!merchants.length && !merchantsLoading) {
            onLoadMerchants();
          }
        }}
      >
        <span className={selectedMerchantLabel ? "" : "opacity-60"}>
          {selectedMerchantLabel || t(locale, "transactions_merchant_placeholder")}
        </span>
        <span className="text-xs opacity-60">▾</span>
      </button>
      <div className="menu dropdown-content w-full rounded-box bg-base-100 p-2 shadow">
        <input
          className="input input-sm input-bordered w-full"
          placeholder={t(locale, "transactions_merchant_placeholder")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <div className="mt-2 max-h-56 overflow-y-auto">
          {merchantsLoading ? (
            <div className="px-2 py-2 text-sm opacity-60">{t(locale, "merchants_loading")}</div>
          ) : merchantMatches.length ? (
            <ul className="space-y-1">
              {merchantMatches.map((merchant) => (
                <li key={merchant._id}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1 text-left text-sm hover:bg-base-200"
                    onClick={() => onSelectMerchant(merchant)}
                  >
                    {merchant.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2 px-2 py-2 text-sm">
              <p className="opacity-60">{t(locale, "transactions_no_merchants")}</p>
              {query.trim() ? (
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={onCreateMerchant}
                  disabled={creatingMerchant || query.trim().length < 2}
                >
                  {t(locale, "transactions_create_merchant")} “{query.trim()}”
                </button>
              ) : null}
            </div>
          )}
        </div>
        <div className="mt-2 border-t border-base-200 pt-2">
          <button
            type="button"
            className="btn btn-ghost btn-xs w-full justify-start"
            onClick={() => {
              onDropdownOpenChange(false);
              onQueryChange("");
              router.push("/app/settings/merchants");
            }}
          >
            {t(locale, "transactions_manage_merchants")}
          </button>
        </div>
      </div>
    </div>
  );
}
