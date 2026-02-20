"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import type { Category } from "@/src/types/category";
import { fieldBase } from "@/components/ui/formStyles";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";

type CategoryPickerProps = {
  locale: Locale;
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  showManageLink?: boolean;
};

const getCategoryName = (locale: Locale, category?: Category | null) =>
  category?.nameCustom?.trim() || category?.nameKey || t(locale, "category_fallback_name");

const getCategoryLabel = (locale: Locale, category?: Category | null) => {
  const name = getCategoryName(locale, category);
  return category?.emoji ? `${category.emoji} ${name}` : name;
};

export function CategoryPicker({
  locale,
  categories,
  value,
  onChange,
  placeholder,
  disabled,
  allowEmpty,
  emptyLabel,
  showManageLink = true,
}: CategoryPickerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(category._id, getCategoryLabel(locale, category));
    });
    return map;
  }, [categories, locale]);

  const selectedCategoryLabel = useMemo(() => {
    if (!value) {
      return emptyLabel ?? t(locale, "transactions_category_uncategorized");
    }
    return categoryMap.get(value) ?? "";
  }, [categoryMap, emptyLabel, locale, value]);

  const categoryMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visibleCategories = categories.filter((category) => !category.isArchived);
    if (!normalizedQuery) return visibleCategories;
    return visibleCategories.filter((category) =>
      getCategoryName(locale, category).toLowerCase().trim().includes(normalizedQuery)
    );
  }, [categories, locale, query]);

  const incomeCategoryMatches = useMemo(
    () =>
      categoryMatches.filter(
        (category) =>
          category.kind === "income" && !category.isArchived
      ),
    [categoryMatches]
  );
  const expenseCategoryMatches = useMemo(
    () =>
      categoryMatches.filter(
        (category) =>
          (category.kind === "expense" || !category.kind) && !category.isArchived
      ),
    [categoryMatches]
  );

  return (
    <div
      className={`dropdown dropdown-bottom w-full ${dropdownOpen ? "dropdown-open" : ""}`}
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
        className={`${fieldBase} flex items-center justify-between text-left`}
        onClick={() => {
          if (disabled) return;
          setDropdownOpen(true);
          setQuery("");
        }}
        disabled={disabled}
      >
        <span className={selectedCategoryLabel ? "" : "opacity-60"}>
          {selectedCategoryLabel || placeholder || t(locale, "transactions_category_search_placeholder")}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </button>
      <ul className="menu dropdown-content z-[50] w-full rounded-box bg-base-100 p-2 shadow">
        <li>
          <input
            className={fieldBase}
            placeholder={t(locale, "transactions_category_search_placeholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={disabled}
          />
        </li>
        {allowEmpty ? (
          <li>
            <button
              type="button"
              className="btn btn-ghost btn-sm w-full justify-start"
              onClick={() => {
                onChange("");
                setDropdownOpen(false);
                setQuery("");
              }}
            >
              {emptyLabel ?? t(locale, "transactions_category_uncategorized")}
            </button>
          </li>
        ) : null}
        {incomeCategoryMatches.length ? (
          <li className="mt-1">
            <div className="px-2 py-1 font-bold opacity-80">
              {t(locale, "transactions_category_income_header")}
            </div>
          </li>
        ) : null}
        {incomeCategoryMatches.map((category) => (
          <li key={category._id}>
            <button
              type="button"
              className="btn btn-ghost btn-sm w-full justify-start"
              onClick={() => {
                onChange(category._id);
                setDropdownOpen(false);
                setQuery("");
              }}
            >
              {getCategoryLabel(locale, category)}
            </button>
          </li>
        ))}
        {expenseCategoryMatches.length ? (
          <li className="mt-1">
            <div className="px-2 py-1 font-bold opacity-80">
              {t(locale, "transactions_category_expense_header")}
            </div>
          </li>
        ) : null}
        {expenseCategoryMatches.map((category) => (
          <li key={category._id}>
            <button
              type="button"
              className="btn btn-ghost btn-sm w-full justify-start"
              onClick={() => {
                onChange(category._id);
                setDropdownOpen(false);
                setQuery("");
              }}
            >
              {getCategoryLabel(locale, category)}
            </button>
          </li>
        ))}
        {showManageLink ? (
          <li className="mt-2 border-t border-base-200 pt-2">
            <button
              type="button"
              className="btn btn-ghost btn-xs w-full justify-start"
              onClick={() => {
                setDropdownOpen(false);
                setQuery("");
                router.push("/app/settings/categories");
              }}
            >
              {t(locale, "transactions_category_manage")}
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
