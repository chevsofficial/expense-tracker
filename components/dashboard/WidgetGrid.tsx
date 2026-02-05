"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useMemo } from "react";
import type React from "react";
import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { Layout, ResponsiveProps } from "react-grid-layout";
import type { DashboardWidget, DashboardWidgetView } from "@/src/dashboard/widgetTypes";
import type { DashboardDataResponse } from "@/src/dashboard/dataTypes";
import { getWidgetDefinition } from "@/src/dashboard/widgetRegistry";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { TotalIncomeWidget } from "@/components/dashboard/widgets/TotalIncomeWidget";
import { TotalExpenseWidget } from "@/components/dashboard/widgets/TotalExpenseWidget";
import { NetCashFlowWidget } from "@/components/dashboard/widgets/NetCashFlowWidget";
import { BreakdownWidget } from "@/components/dashboard/widgets/BreakdownWidget";
import { BudgetVsActualWidget } from "@/components/dashboard/widgets/BudgetVsActualWidget";
import { TransactionCountWidget } from "@/components/dashboard/widgets/TransactionCountWidget";

const ResponsiveGridLayout = dynamic<ResponsiveProps>(
  () => import("react-grid-layout").then((mod) => mod.Responsive),
  { ssr: false }
);
type GridProps = Record<string, unknown>;
const Grid = ResponsiveGridLayout as unknown as ComponentType<GridProps>;

type WidgetGridProps = {
  widgets: DashboardWidget[];
  data: DashboardDataResponse | null;
  locale: Locale;
  editMode: boolean;
  onLayoutChange: (layout: Layout[]) => void;
  onViewChange: (id: string, view: DashboardWidgetView) => void;
  onRemove: (id: string) => void;
};

export function WidgetGrid({
  widgets,
  data,
  locale,
  editMode,
  onLayoutChange,
  onViewChange,
  onRemove,
}: WidgetGridProps) {
  const layout = useMemo(
    () =>
      widgets.map((widget) => ({
        i: widget.id,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
      })),
    [widgets]
  );

  const handleLayoutChange = (nextLayout: Layout[]) => {
    onLayoutChange(nextLayout);
  };

  return (
    <div className="w-full">
      <div className="mx-auto max-w-6xl rounded-lg border border-base-300 bg-base-100 p-3 overflow-hidden">
        <Grid
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isBounded={true}
          preventCollision={true}
          allowOverlap={false}
          compactType="vertical"
          verticalCompact={true}
          isDraggable={editMode}
          isResizable={editMode}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".widget-drag-handle"
          measureBeforeMount={true}
        >
          {widgets.map((widget) => {
            const definition = getWidgetDefinition(widget.type);
            if (!definition) return null;

            const title = t(locale, definition.titleKey);
            const totalsByCurrency = data?.totalsByCurrency ?? {};

            let content: React.ReactElement | null = null;

            switch (widget.type) {
          case "total_income":
            content = (
              <TotalIncomeWidget
                view={widget.view}
                locale={locale}
                totalsByCurrency={totalsByCurrency}
                currency={widget.currency}
              />
            );
            break;
          case "total_expense":
            content = (
              <TotalExpenseWidget
                view={widget.view}
                locale={locale}
                totalsByCurrency={totalsByCurrency}
                currency={widget.currency}
              />
            );
            break;
          case "net_cash_flow":
            content = (
              <NetCashFlowWidget
                view={widget.view}
                locale={locale}
                totalsByCurrency={totalsByCurrency}
                currency={widget.currency}
              />
            );
            break;
          case "income_by_categories":
            content = (
              <BreakdownWidget
                view={widget.view}
                locale={locale}
                rows={(data?.byCategory.income ?? []).map((row) => ({
                  id: row.categoryId,
                  name:
                    row.categoryNameCustom?.trim() ||
                    (row.categoryNameKey ? t(locale, row.categoryNameKey) : "Uncategorized"),
                  currency: row.currency,
                  amountMinor: row.amountMinor,
                  count: row.count,
                }))}
                limit={widget.limit}
                currency={widget.currency}
                nameHeaderKey="dashboard_table_category"
              />
            );
            break;
          case "expense_by_categories":
            content = (
              <BreakdownWidget
                view={widget.view}
                locale={locale}
                rows={(data?.byCategory.expense ?? []).map((row) => ({
                  id: row.categoryId,
                  name:
                    row.categoryNameCustom?.trim() ||
                    (row.categoryNameKey ? t(locale, row.categoryNameKey) : "Uncategorized"),
                  currency: row.currency,
                  amountMinor: row.amountMinor,
                  count: row.count,
                }))}
                limit={widget.limit}
                currency={widget.currency}
                nameHeaderKey="dashboard_table_category"
              />
            );
            break;
          case "income_by_groups":
            content = (
              <BreakdownWidget
                view={widget.view}
                locale={locale}
                rows={(data?.byGroup.income ?? []).map((row) => ({
                  id: row.groupId,
                  name: row.groupName,
                  currency: row.currency,
                  amountMinor: row.amountMinor,
                  count: row.count,
                }))}
                limit={widget.limit}
                currency={widget.currency}
                nameHeaderKey="dashboard_table_group"
              />
            );
            break;
          case "expense_by_groups":
            content = (
              <BreakdownWidget
                view={widget.view}
                locale={locale}
                rows={(data?.byGroup.expense ?? []).map((row) => ({
                  id: row.groupId,
                  name: row.groupName,
                  currency: row.currency,
                  amountMinor: row.amountMinor,
                  count: row.count,
                }))}
                limit={widget.limit}
                currency={widget.currency}
                nameHeaderKey="dashboard_table_group"
              />
            );
            break;
          case "income_by_merchants":
            content = (
              <BreakdownWidget
                view={widget.view}
                locale={locale}
                rows={(data?.byMerchant.income ?? []).map((row) => ({
                  id: row.merchantId,
                  name: row.merchantName,
                  currency: row.currency,
                  amountMinor: row.amountMinor,
                  count: row.count,
                }))}
                limit={widget.limit}
                currency={widget.currency}
                nameHeaderKey="dashboard_table_merchant"
              />
            );
            break;
          case "expense_by_merchants":
            content = (
              <BreakdownWidget
                view={widget.view}
                locale={locale}
                rows={(data?.byMerchant.expense ?? []).map((row) => ({
                  id: row.merchantId,
                  name: row.merchantName,
                  currency: row.currency,
                  amountMinor: row.amountMinor,
                  count: row.count,
                }))}
                limit={widget.limit}
                currency={widget.currency}
                nameHeaderKey="dashboard_table_merchant"
              />
            );
            break;
          case "income_by_currency":
            content = (
              <BreakdownWidget
                view={widget.view}
                locale={locale}
                rows={Object.entries(totalsByCurrency).map(([currency, totals]) => ({
                  id: currency,
                  name: currency,
                  currency,
                  amountMinor: totals.incomeMinor,
                  count: totals.incomeCount,
                }))}
                limit={widget.limit}
                currency={widget.currency}
                nameHeaderKey="dashboard_table_currency"
                showCurrency={false}
              />
            );
            break;
          case "expense_by_currency":
            content = (
              <BreakdownWidget
                view={widget.view}
                locale={locale}
                rows={Object.entries(totalsByCurrency).map(([currency, totals]) => ({
                  id: currency,
                  name: currency,
                  currency,
                  amountMinor: totals.expenseMinor,
                  count: totals.expenseCount,
                }))}
                limit={widget.limit}
                currency={widget.currency}
                nameHeaderKey="dashboard_table_currency"
                showCurrency={false}
              />
            );
            break;
          case "income_tx_count":
            content = (
              <TransactionCountWidget
                view={widget.view}
                locale={locale}
                totalsByCurrency={totalsByCurrency}
                currency={widget.currency}
                kind="income"
              />
            );
            break;
          case "expense_tx_count":
            content = (
              <TransactionCountWidget
                view={widget.view}
                locale={locale}
                totalsByCurrency={totalsByCurrency}
                currency={widget.currency}
                kind="expense"
              />
            );
            break;
          case "budget_vs_actual":
            content = (
              <BudgetVsActualWidget
                view={widget.view}
                locale={locale}
                budgetVsActual={data?.budgetVsActual ?? {}}
              />
            );
            break;
          default:
            content = null;
        }

            return (
              <div key={widget.id} className="h-full min-h-0">
                <WidgetShell
                  title={title}
                  locale={locale}
                  view={widget.view}
                  supportedViews={definition.supportedViews}
                  editMode={editMode}
                  onViewChange={(view) => onViewChange(widget.id, view)}
                  onRemove={() => onRemove(widget.id)}
                >
                  {data ? (
                    content
                  ) : (
                    <p className="text-sm opacity-60">{t(locale, "dashboard_loading")}</p>
                  )}
                </WidgetShell>
              </div>
            );
          })}
        </Grid>
      </div>
    </div>
  );
}
