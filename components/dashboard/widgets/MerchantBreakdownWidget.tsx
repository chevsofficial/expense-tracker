"use client";

import { useMemo, useState } from "react";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

const formatCurrency = (locale: Locale, amountMinor: number, currency: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);

export type MerchantBreakdownRow = {
  id: string | null;
  name: string;
  currency: string;
  amountMinor: number;
  count: number;
};

type MerchantBreakdownWidgetProps = {
  locale: Locale;
  title: string;
  rows: MerchantBreakdownRow[];
};

export function MerchantBreakdownWidget({ locale, title, rows }: MerchantBreakdownWidgetProps) {
  const [view, setView] = useState<"card" | "table" | "pie">("card");
  const [limit, setLimit] = useState(5);

  const visibleRows = useMemo(() => rows.slice(0, limit), [rows, limit]);
  const total = visibleRows.reduce((sum, row) => sum + row.amountMinor, 0);

  return (
    <div className="card bg-base-100 shadow col-span-12 lg:col-span-6">
      <div className="card-body space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase opacity-60">{title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="select select-bordered select-sm"
              value={view}
              onChange={(event) => setView(event.target.value as "card" | "table" | "pie")}
            >
              <option value="card">{t(locale, "dashboard_view_card")}</option>
              <option value="pie">{t(locale, "dashboard_view_pie")}</option>
              <option value="table">{t(locale, "dashboard_view_table")}</option>
            </select>
            <select
              className="select select-bordered select-sm"
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
            >
              <option value={3}>{t(locale, "dashboard_top_n_3")}</option>
              <option value={5}>{t(locale, "dashboard_top_n_5")}</option>
            </select>
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <p className="text-sm opacity-70">{t(locale, "dashboard_no_merchants")}</p>
        ) : null}

        {visibleRows.length > 0 && view === "table" ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-base-200">
                <tr>
                  <th>{t(locale, "dashboard_table_merchant")}</th>
                  <th className="text-right">{t(locale, "dashboard_table_amount")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={`${row.id ?? "unassigned"}-${row.currency}`}>
                    <td>{row.name}</td>
                    <td className="text-right">
                      {formatCurrency(locale, row.amountMinor, row.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {visibleRows.length > 0 && view === "card" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleRows.map((row) => (
              <div
                key={`${row.id ?? "unassigned"}-${row.currency}`}
                className="rounded-lg border border-base-200 p-3"
              >
                <p className="text-sm font-semibold">{row.name}</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(locale, row.amountMinor, row.currency)}
                </p>
                <p className="text-xs opacity-60">
                  {row.count} {t(locale, "dashboard_transactions")}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {visibleRows.length > 0 && view === "pie" ? (
          <div className="space-y-3">
            {visibleRows.map((row) => {
              const percent = total > 0 ? Math.round((row.amountMinor / total) * 100) : 0;
              return (
                <div key={`${row.id ?? "unassigned"}-${row.currency}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{row.name}</span>
                    <span>{formatCurrency(locale, row.amountMinor, row.currency)}</span>
                  </div>
                  <progress
                    className="progress progress-secondary w-full"
                    value={percent}
                    max={100}
                  />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
