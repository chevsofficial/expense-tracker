"use client";

import { t } from "@/src/i18n/t";
import { formatCurrency } from "@/src/lib/format";
import type { Locale } from "@/src/i18n/messages";

type TotalsByCurrency = {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  transactionCount: number;
};

type StatsCardsProps = {
  totalsByCurrency: TotalsByCurrency[];
  locale: Locale;
};

export function StatsCards({ totalsByCurrency, locale }: StatsCardsProps) {
  if (!totalsByCurrency.length) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <p className="opacity-70">{t(locale, "dashboard_no_activity")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {totalsByCurrency.map((total) => (
        <div key={total.currency} className="card bg-base-100 shadow">
          <div className="card-body space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-60">
                {t(locale, "dashboard_total_spend")} · {total.currency}
              </p>
              <p className="text-2xl font-semibold">
                {formatCurrency(total.expenseMinor, total.currency, locale)}
              </p>
            </div>
            <div className="grid gap-1 text-sm opacity-70">
              <p>
                {t(locale, "dashboard_income")}: {formatCurrency(total.incomeMinor, total.currency, locale)}
              </p>
              <p>
                {t(locale, "dashboard_spend")}: {formatCurrency(total.expenseMinor, total.currency, locale)}
              </p>
              <p>
                {t(locale, "dashboard_net")}: {formatCurrency(total.netMinor, total.currency, locale)}
              </p>
              <p>
                {t(locale, "dashboard_transactions")}: {new Intl.NumberFormat(locale).format(total.transactionCount)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
