"use client";

import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type BudgetVsActualSummaryCardProps = {
  locale: Locale;
  data: {
    plannedMinor: number;
    actualMinor: number;
    remainingMinor: number;
    progressPct: number;
    currency: string;
  };
  className?: string;
};

const formatCurrency = (locale: Locale, amountMinor: number, currency: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);

export function BudgetVsActualSummaryCard({
  locale,
  data,
  className,
}: BudgetVsActualSummaryCardProps) {
  const progress = Math.round(data.progressPct * 100);

  return (
    <div className={`card bg-base-100 shadow col-span-12 lg:col-span-6 ${className ?? ""}`}>
      <div className="card-body space-y-4">
        <h3 className="text-sm font-semibold uppercase opacity-60">
          {t(locale, "dashboard_widget_budget_vs_actual")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase opacity-60">
              {t(locale, "dashboard_budget_vs_actual_planned")}
            </p>
            <p className="text-lg font-semibold">
              {formatCurrency(locale, data.plannedMinor, data.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase opacity-60">
              {t(locale, "dashboard_budget_vs_actual_actual")}
            </p>
            <p className="text-lg font-semibold">
              {formatCurrency(locale, data.actualMinor, data.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase opacity-60">
              {t(locale, "dashboard_budget_vs_actual_remaining")}
            </p>
            <p className="text-lg font-semibold">
              {formatCurrency(locale, data.remainingMinor, data.currency)}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase opacity-60">
            <span>{t(locale, "dashboard_budget_vs_actual_progress")}</span>
            <span>{progress}%</span>
          </div>
          <progress className="progress progress-accent w-full" value={progress} max={100} />
        </div>
      </div>
    </div>
  );
}
