"use client";

import type { FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { CategoryPicker } from "@/components/pickers/CategoryPicker";
import { MerchantPicker } from "@/components/pickers/MerchantPicker";
import { ScheduleFields } from "@/components/recurring/ScheduleFields";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  kind?: "income" | "expense" | "both";
  isArchived?: boolean;
};

type Merchant = {
  _id: string;
  name: string;
  isArchived?: boolean;
};

type RecurringForm = {
  name: string;
  amount: string;
  currency: string;
  kind: "expense" | "income";
  categoryId: string;
  merchantId: string;
  frequency: "monthly" | "weekly";
  interval: string;
  dayOfMonth: string;
  startDate: string;
};

type RecurringFormModalProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  locale: Locale;
  formState: RecurringForm;
  dayOfMonthOverridden: boolean;
  categories: Category[];
  merchants: Merchant[];
  creatingMerchant: boolean;
  merchantsLoading: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormChange: (form: RecurringForm) => void;
  onFrequencyChange: (value: "monthly" | "weekly") => void;
  onIntervalChange: (value: string) => void;
  onDayOfMonthChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onOverrideChange: (value: boolean) => void;
  onCreateMerchant: (name: string) => Promise<Merchant | null>;
  onLoadMerchants: () => void;
};

export function RecurringFormModal({
  open,
  title,
  submitLabel,
  locale,
  formState,
  dayOfMonthOverridden,
  categories,
  merchants,
  creatingMerchant,
  merchantsLoading,
  onClose,
  onSubmit,
  onFormChange,
  onFrequencyChange,
  onIntervalChange,
  onDayOfMonthChange,
  onStartDateChange,
  onOverrideChange,
  onCreateMerchant,
  onLoadMerchants,
}: RecurringFormModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="form-control w-full">
            <span className="label-text">{t(locale, "recurring_name")}</span>
            <input
              className="input input-bordered"
              value={formState.name}
              onChange={(event) => onFormChange({ ...formState, name: event.target.value })}
              required
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">{t(locale, "recurring_amount")}</span>
            <input
              className="input input-bordered"
              type="number"
              min="0"
              step="0.01"
              value={formState.amount}
              onChange={(event) => onFormChange({ ...formState, amount: event.target.value })}
              required
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">{t(locale, "recurring_currency")}</span>
            <select
              className="select select-bordered w-full"
              value={formState.currency}
              onChange={(event) => onFormChange({ ...formState, currency: event.target.value })}
              required
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text">{t(locale, "recurring_kind")}</span>
            <select
              className="select select-bordered"
              value={formState.kind}
              onChange={(event) =>
                onFormChange({ ...formState, kind: event.target.value as RecurringForm["kind"] })
              }
            >
              <option value="expense">{t(locale, "category_kind_expense")}</option>
              <option value="income">{t(locale, "category_kind_income")}</option>
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text">{t(locale, "recurring_category")}</span>
            <CategoryPicker
              locale={locale}
              categories={categories}
              value={formState.categoryId === "uncategorized" ? "" : formState.categoryId}
              onChange={(categoryId) =>
                onFormChange({
                  ...formState,
                  categoryId: categoryId || "uncategorized",
                })
              }
              allowEmpty
              emptyLabel={t(locale, "transactions_category_uncategorized")}
              placeholder={t(locale, "transactions_category_search_placeholder")}
              showManageLink
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">{t(locale, "recurring_merchant")}</span>
            <MerchantPicker
              locale={locale}
              merchants={merchants}
              value={formState.merchantId === "unassigned" ? "" : formState.merchantId}
              onChange={(merchantId) =>
                onFormChange({
                  ...formState,
                  merchantId: merchantId || "unassigned",
                })
              }
              placeholder={t(locale, "transactions_merchant_placeholder")}
              allowCreate
              creating={creatingMerchant}
              onCreateMerchant={onCreateMerchant}
              onLoadMerchants={onLoadMerchants}
              loading={merchantsLoading}
              showManageLink
            />
          </label>
        </div>

        <ScheduleFields
          locale={locale}
          frequency={formState.frequency}
          interval={formState.interval}
          dayOfMonth={formState.dayOfMonth}
          startDate={formState.startDate}
          dayOfMonthOverridden={dayOfMonthOverridden}
          onFrequencyChange={onFrequencyChange}
          onIntervalChange={onIntervalChange}
          onDayOfMonthChange={onDayOfMonthChange}
          onStartDateChange={onStartDateChange}
          onOverrideChange={onOverrideChange}
        />

        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t(locale, "recurring_cancel")}
          </button>
          <button className="btn btn-primary" type="submit">
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
