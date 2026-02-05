import { formatCurrency } from "@/src/lib/format";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import type { DashboardWidgetView } from "@/src/dashboard/widgetTypes";
import { PieChartWidget } from "@/components/charts/PieChartWidget";
import { BarChartWidget } from "@/components/charts/BarChartWidget";

type BreakdownRow = {
  id: string | null;
  name: string;
  currency: string;
  amountMinor: number;
  count: number;
};

type BreakdownWidgetProps = {
  view: DashboardWidgetView;
  locale: Locale;
  rows: BreakdownRow[];
  limit?: number;
  currency?: string;
  nameHeaderKey: string;
  showCurrency?: boolean;
};

const formatName = (row: BreakdownRow) => row.name || "Uncategorized";

export function BreakdownWidget({
  view,
  locale,
  rows,
  limit = 5,
  currency,
  nameHeaderKey,
  showCurrency = true,
}: BreakdownWidgetProps) {
  if (rows.length === 0) {
    return <p className="text-sm opacity-60">{t(locale, "dashboard_no_activity")}</p>;
  }

  if (view === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead className="bg-base-200 text-base-content">
            <tr>
              <th>{t(locale, nameHeaderKey)}</th>
              {showCurrency ? <th>{t(locale, "dashboard_table_currency")}</th> : null}
              <th>{t(locale, "dashboard_table_amount")}</th>
              <th>{t(locale, "dashboard_table_count")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.id ?? "uncategorized"}-${row.currency}`}>
                <td>{formatName(row)}</td>
                {showCurrency ? <td>{row.currency}</td> : null}
                <td>{formatCurrency(row.amountMinor, row.currency, locale)}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const availableCurrency = currency ?? rows[0]?.currency ?? "";
  const filteredRows = rows.filter((row) => row.currency === availableCurrency);
  const sortedRows = [...filteredRows].sort((a, b) => b.amountMinor - a.amountMinor);
  const topRows = sortedRows.slice(0, limit);

  if (view === "bar") {
    const chartData = topRows.map((row) => ({
      name: formatName(row),
      amount: row.amountMinor,
    }));

    return (
      <BarChartWidget
        data={chartData}
        xKey="name"
        bars={[{ key: "amount", label: t(locale, "dashboard_table_amount"), color: "#6DBE45" }]}
        valueFormatter={(value) => formatCurrency(value, availableCurrency, locale)}
      />
    );
  }

  const total = sortedRows.reduce((sum, row) => sum + row.amountMinor, 0);
  const other = total - topRows.reduce((sum, row) => sum + row.amountMinor, 0);

  const pieData = [
    ...topRows.map((row) => ({
      name: formatName(row),
      value: row.amountMinor,
    })),
  ];

  if (other > 0) {
    pieData.push({ name: "Other", value: other });
  }

  return (
    <PieChartWidget
      data={pieData}
      valueFormatter={(value) => formatCurrency(value, availableCurrency, locale)}
    />
  );
}
