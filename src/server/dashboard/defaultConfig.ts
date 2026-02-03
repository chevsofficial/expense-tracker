import { randomUUID } from "crypto";
import type { DashboardWidget } from "@/src/dashboard/widgetTypes";

export function buildDefaultDashboardConfig(): DashboardWidget[] {
  return [
    {
      id: randomUUID(),
      type: "total_income",
      titleKey: "dashboard_widget_total_income",
      x: 0,
      y: 0,
      w: 4,
      h: 2,
      view: "card",
    },
    {
      id: randomUUID(),
      type: "total_expense",
      titleKey: "dashboard_widget_total_expenses",
      x: 4,
      y: 0,
      w: 4,
      h: 2,
      view: "card",
    },
    {
      id: randomUUID(),
      type: "net_cash_flow",
      titleKey: "dashboard_widget_net_cash_flow",
      x: 8,
      y: 0,
      w: 4,
      h: 2,
      view: "card",
    },
  ];
}
