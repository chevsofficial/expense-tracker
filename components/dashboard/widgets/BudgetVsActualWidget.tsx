import { formatCurrency, formatPercent } from "@/src/lib/format";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import type { DashboardWidgetView } from "@/src/dashboard/widgetTypes";
import type { BudgetVsActualEntry } from "@/src/dashboard/dataTypes";
import { BarChartWidget } from "@/components/charts/BarChartWidget";

type BudgetVsActualWidgetProps = {
  view: DashboardWidgetView;
  locale: Locale;
  budgetVsActual: Record<string, BudgetVsActualEntry>;
};

export function BudgetVsActualWidget({ view, locale, budgetVsActual }: BudgetVsActualWidgetProps) {
  const rows = Object.entries(budgetVsActual).map(([currency, values]) => ({
    currency,
    ...values,
  }));
  if (rows.length === 0) {
    return <p className="text-sm opacity-60">{t(locale, "dashboard_no_activity")}</p>;
  }

  if (view === "bar") {
    const chartData = rows.map((row) => ({
      currency: row.currency,
      planned: row.plannedMinor,
      actual: row.actualMinor,
    }));

    return (
      <BarChartWidget
        data={chartData}
        xKey="currency"
        bars={[
          { key: "planned", label: t(locale, "dashboard_table_planned"), color: "#2F6F2E" },
          { key: "actual", label: t(locale, "dashboard_table_actual"), color: "#F4C430" },
        ]}
        valueFormatter={(value) => new Intl.NumberFormat(locale).format(value / 100)}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>{t(locale, "dashboard_table_currency")}</th>
            <th>{t(locale, "dashboard_table_planned")}</th>
            <th>{t(locale, "dashboard_table_actual")}</th>
            <th>{t(locale, "dashboard_table_remaining")}</th>
            <th>{t(locale, "dashboard_table_progress")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.currency}>
              <td>{row.currency}</td>
              <td>{formatCurrency(row.plannedMinor, row.currency, locale)}</td>
              <td>{formatCurrency(row.actualMinor, row.currency, locale)}</td>
              <td>{formatCurrency(row.remainingMinor, row.currency, locale)}</td>
              <td>{formatPercent(row.progressPct, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
