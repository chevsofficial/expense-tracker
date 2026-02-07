"use client";

import { useMemo, useState } from "react";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import { PieChartWidget } from "@/components/charts/PieChartWidget";
import { SurfaceCard, SurfaceCardBody } from "@/components/ui/SurfaceCard";

const formatCurrency = (locale: Locale, amountMinor: number, currency: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);

export type GroupBreakdownRow = {
  groupId: string | null;
  groupName: string;
  currency: string;
  amountMinor: number;
  count: number;
};

type GroupBreakdownWidgetProps = {
  locale: Locale;
  title: string;
  rows: GroupBreakdownRow[];
};

export function GroupBreakdownWidget({ locale, title, rows }: GroupBreakdownWidgetProps) {
  const [view, setView] = useState<"card" | "table" | "pie" | "percentage">("card");

  const chartRows = useMemo(() => rows.slice(0, 8), [rows]);
  const total = useMemo(() => rows.reduce((sum, row) => sum + row.amountMinor, 0), [rows]);
  const pieData = useMemo(
    () =>
      chartRows.map((row) => ({
        name: row.groupName,
        value: row.amountMinor,
      })),
    [chartRows]
  );

  return (
    <SurfaceCard className="col-span-12 lg:col-span-6">
      <SurfaceCardBody className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase opacity-60">{title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="select select-bordered select-sm"
              value={view}
              onChange={(event) =>
                setView(event.target.value as "card" | "table" | "pie" | "percentage")
              }
            >
              <option value="card">{t(locale, "dashboard_view_card")}</option>
              <option value="pie">{t(locale, "dashboard_view_pie")}</option>
              <option value="table">{t(locale, "dashboard_view_table")}</option>
              <option value="percentage">{t(locale, "dashboard_view_percentage")}</option>
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm opacity-70">{t(locale, "dashboard_no_categories")}</p>
        ) : null}

        {rows.length > 0 && view === "table" ? (
          <div className="max-h-[360px] overflow-auto">
            <table className="table">
              <thead className="bg-base-200">
                <tr>
                  <th>{t(locale, "dashboard_table_category")}</th>
                  <th className="text-right">{t(locale, "dashboard_table_amount")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.groupId ?? "ungrouped"}-${row.currency}`}>
                    <td>{row.groupName}</td>
                    <td className="text-right">
                      {formatCurrency(locale, row.amountMinor, row.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {rows.length > 0 && view === "card" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((row) => (
              <div
                key={`${row.groupId ?? "ungrouped"}-${row.currency}`}
                className="rounded-lg border border-base-300 p-3"
              >
                <p className="text-sm font-semibold">{row.groupName}</p>
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

        {rows.length > 0 && view === "pie" ? (
          <PieChartWidget
            data={pieData}
            valueFormatter={(value) => formatCurrency(locale, value, chartRows[0]?.currency ?? "USD")}
          />
        ) : null}

        {rows.length > 0 && view === "percentage" ? (
          <div className="space-y-3">
            {rows.map((row) => {
              const percent = total > 0 ? (row.amountMinor / total) * 100 : 0;
              return (
                <div key={`${row.groupId ?? "ungrouped"}-${row.currency}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{row.groupName}</span>
                    <span className="text-right">
                      {formatCurrency(locale, row.amountMinor, row.currency)} · {percent.toFixed(1)}%
                    </span>
                  </div>
                  <progress
                    className="progress progress-accent w-full"
                    value={Math.round(percent)}
                    max={100}
                  />
                </div>
              );
            })}
          </div>
        ) : null}
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
