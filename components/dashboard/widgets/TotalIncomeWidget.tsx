import { formatCurrency } from "@/src/lib/format";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import type { DashboardTotalsByCurrency } from "@/src/dashboard/dataTypes";
import type { DashboardWidgetView } from "@/src/dashboard/widgetTypes";

type TotalIncomeWidgetProps = {
  view: DashboardWidgetView;
  locale: Locale;
  totalsByCurrency: DashboardTotalsByCurrency;
  currency?: string;
};

export function TotalIncomeWidget({ view, locale, totalsByCurrency, currency }: TotalIncomeWidgetProps) {
  const rows = Object.entries(totalsByCurrency).map(([code, totals]) => ({
    currency: code,
    amountMinor: totals.incomeMinor,
    count: totals.incomeCount,
  }));

  const filteredRows = currency ? rows.filter((row) => row.currency === currency) : rows;
  if (filteredRows.length === 0) {
    return <p className="text-sm opacity-60">{t(locale, "dashboard_no_activity")}</p>;
  }

  if (view === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>{t(locale, "dashboard_table_currency")}</th>
              <th>{t(locale, "dashboard_table_amount")}</th>
              <th>{t(locale, "dashboard_table_count")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.currency}>
                <td>{row.currency}</td>
                <td>{formatCurrency(row.amountMinor, row.currency, locale)}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredRows.map((row) => (
        <div key={row.currency}>
          <p className="text-xs uppercase opacity-60">{row.currency}</p>
          <p className="text-2xl font-semibold">
            {formatCurrency(row.amountMinor, row.currency, locale)}
          </p>
          <p className="text-xs opacity-60">
            {row.count} {t(locale, "dashboard_transactions")}
          </p>
        </div>
      ))}
    </div>
  );
}
