import type { DashboardMetricType, DashboardWidgetView } from "./widgetTypes";

export type DashboardWidgetDefinition = {
  type: DashboardMetricType;
  titleKey: string;
  supportedViews: DashboardWidgetView[];
  defaultView: DashboardWidgetView;
  defaultSize: { w: number; h: number };
  kind?: "income" | "expense";
};

export const dashboardWidgetRegistry: DashboardWidgetDefinition[] = [
  {
    type: "total_income",
    titleKey: "dashboard_widget_total_income",
    supportedViews: ["card", "table"],
    defaultView: "card",
    defaultSize: { w: 4, h: 2 },
  },
  {
    type: "total_expense",
    titleKey: "dashboard_widget_total_expenses",
    supportedViews: ["card", "table"],
    defaultView: "card",
    defaultSize: { w: 4, h: 2 },
  },
  {
    type: "net_cash_flow",
    titleKey: "dashboard_widget_net_cash_flow",
    supportedViews: ["card", "table"],
    defaultView: "card",
    defaultSize: { w: 4, h: 2 },
  },
  {
    type: "income_by_categories",
    titleKey: "dashboard_widget_income_by_categories",
    supportedViews: ["table", "bar", "pie"],
    defaultView: "table",
    defaultSize: { w: 6, h: 4 },
    kind: "income",
  },
  {
    type: "expense_by_categories",
    titleKey: "dashboard_widget_expense_by_categories",
    supportedViews: ["table", "bar", "pie"],
    defaultView: "table",
    defaultSize: { w: 6, h: 4 },
    kind: "expense",
  },
  {
    type: "income_by_groups",
    titleKey: "dashboard_widget_income_by_groups",
    supportedViews: ["table", "bar", "pie"],
    defaultView: "table",
    defaultSize: { w: 6, h: 4 },
    kind: "income",
  },
  {
    type: "expense_by_groups",
    titleKey: "dashboard_widget_expense_by_groups",
    supportedViews: ["table", "bar", "pie"],
    defaultView: "table",
    defaultSize: { w: 6, h: 4 },
    kind: "expense",
  },
  {
    type: "income_by_merchants",
    titleKey: "dashboard_widget_income_by_merchants",
    supportedViews: ["table", "bar", "pie"],
    defaultView: "table",
    defaultSize: { w: 6, h: 4 },
    kind: "income",
  },
  {
    type: "expense_by_merchants",
    titleKey: "dashboard_widget_expense_by_merchants",
    supportedViews: ["table", "bar", "pie"],
    defaultView: "table",
    defaultSize: { w: 6, h: 4 },
    kind: "expense",
  },
  {
    type: "income_by_currency",
    titleKey: "dashboard_widget_income_by_currency",
    supportedViews: ["table", "bar", "pie"],
    defaultView: "table",
    defaultSize: { w: 4, h: 3 },
    kind: "income",
  },
  {
    type: "expense_by_currency",
    titleKey: "dashboard_widget_expense_by_currency",
    supportedViews: ["table", "bar", "pie"],
    defaultView: "table",
    defaultSize: { w: 4, h: 3 },
    kind: "expense",
  },
  {
    type: "income_tx_count",
    titleKey: "dashboard_widget_income_tx_count",
    supportedViews: ["card", "table"],
    defaultView: "card",
    defaultSize: { w: 4, h: 2 },
    kind: "income",
  },
  {
    type: "expense_tx_count",
    titleKey: "dashboard_widget_expense_tx_count",
    supportedViews: ["card", "table"],
    defaultView: "card",
    defaultSize: { w: 4, h: 2 },
    kind: "expense",
  },
  {
    type: "budget_vs_actual",
    titleKey: "dashboard_widget_budget_vs_actual",
    supportedViews: ["table", "bar"],
    defaultView: "table",
    defaultSize: { w: 6, h: 4 },
  },
];

const widgetDefinitionMap = new Map(
  dashboardWidgetRegistry.map((widget) => [widget.type, widget])
);

export function getWidgetDefinition(type: DashboardMetricType) {
  return widgetDefinitionMap.get(type);
}

export function isDashboardMetricType(value: string): value is DashboardMetricType {
  return widgetDefinitionMap.has(value as DashboardMetricType);
}
