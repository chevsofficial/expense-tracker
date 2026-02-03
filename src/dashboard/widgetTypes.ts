export type DashboardMetricType =
  | "total_income"
  | "total_expense"
  | "net_cash_flow"
  | "income_by_categories"
  | "expense_by_categories"
  | "income_by_groups"
  | "expense_by_groups"
  | "income_by_merchants"
  | "expense_by_merchants"
  | "income_by_currency"
  | "expense_by_currency"
  | "income_tx_count"
  | "expense_tx_count"
  | "budget_vs_actual";

export type DashboardWidgetView = "card" | "table" | "bar" | "pie";

export type DashboardWidget = {
  id: string;
  type: DashboardMetricType;
  titleKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
  view: DashboardWidgetView;
  currency?: string;
  kind?: "income" | "expense";
  limit?: number;
};
