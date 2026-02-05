"use client";

import { ProgressBar } from "@/components/budget/ProgressBar";
import { formatCurrency, formatPercent } from "@/src/lib/format";
import type { Locale } from "@/src/i18n/messages";

type SummaryRow = {
  categoryId: string | null;
  categoryName: string;
  plannedMinor: number;
  actualMinor: number;
  remainingMinor: number;
  progressPct: number;
  transactionCount: number;
};

type BudgetSummaryTableProps = {
  rows: SummaryRow[];
  locale: Locale;
  currency: string;
  labels: {
    category: string;
    planned: string;
    actual: string;
    remaining: string;
    progress: string;
  };
};

export function BudgetSummaryTable({ rows, locale, currency, labels }: BudgetSummaryTableProps) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table className="table">
        <thead className="bg-base-200 text-base-content">
          <tr>
            <th>{labels.category}</th>
            <th>{labels.planned}</th>
            <th>{labels.actual}</th>
            <th>{labels.remaining}</th>
            <th>{labels.progress}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.categoryId ?? "uncategorized"}-${currency}`}>
              <td>{row.categoryName}</td>
              <td>{formatCurrency(row.plannedMinor, currency, locale)}</td>
              <td>{formatCurrency(row.actualMinor, currency, locale)}</td>
              <td>{formatCurrency(row.remainingMinor, currency, locale)}</td>
              <td>
                <div className="flex items-center gap-3">
                  <ProgressBar value={row.progressPct} />
                  <span className="text-xs opacity-60">
                    {formatPercent(row.progressPct, locale)}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
