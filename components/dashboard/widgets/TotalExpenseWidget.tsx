import { formatCurrency } from "@/src/lib/format";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import type { DashboardTotalsByCurrency } from "@/src/dashboard/dataTypes";
import type { DashboardWidgetView } from "@/src/dashboard/widgetTypes";

type TotalExpenseWidgetProps = {
  view: DashboardWidgetView;
  locale: Locale;
  totalsByCurrency: DashboardTotalsByCurrency;
  currency?: string;
  showCount?: boolean;
};

export function TotalExpenseWidget({
  view,
  locale,
  totalsByCurrency,
  currency,
  showCount = false,
}: TotalExpenseWidgetProps) {
  const rows = Object.entries(totalsByCurrency).map(([code, totals]) => ({
    currency: code,
    amountMinor: totals.expenseMinor,
    count: totals.expenseCount,
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
              {showCount ? <th>{t(locale, "dashboard_table_count")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.currency}>
                <td>{row.currency}</td>
                <td>{formatCurrency(row.amountMinor, row.currency, locale)}</td>
                {showCount ? <td>{row.count}</td> : null}
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
          {showCount ? (
            <p className="text-xs opacity-60">
              {row.count} {t(locale, "dashboard_transactions")}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
