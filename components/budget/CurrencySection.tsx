"use client";

import { BudgetSummaryTable } from "@/components/budget/BudgetSummaryTable";
import { formatCurrency } from "@/src/lib/format";
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

type CurrencySectionProps = {
  currency: string;
  rows: SummaryRow[];
  totals: { plannedMinor: number; actualMinor: number; remainingMinor: number };
  locale: Locale;
  labels: {
    category: string;
    planned: string;
    actual: string;
    remaining: string;
    progress: string;
  };
};

export function CurrencySection({ currency, rows, totals, locale, labels }: CurrencySectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{currency}</h2>
          <p className="text-sm opacity-70">
            {labels.planned}: {formatCurrency(totals.plannedMinor, currency, locale)} · {labels.actual}:{" "}
            {formatCurrency(totals.actualMinor, currency, locale)} · {labels.remaining}:{" "}
            {formatCurrency(totals.remainingMinor, currency, locale)}
          </p>
        </div>
      </div>
      <BudgetSummaryTable rows={rows} locale={locale} currency={currency} labels={labels} />
    </div>
  );
}
