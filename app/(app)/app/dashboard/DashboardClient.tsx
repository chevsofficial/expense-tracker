"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getJSON, putJSON } from "@/src/lib/apiClient";
import { formatMonthLabel } from "@/src/utils/month";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { WidgetGrid } from "@/components/dashboard/WidgetGrid";
import type { GridLayout } from "@/components/dashboard/WidgetGrid";
import { WidgetPickerModal } from "@/components/dashboard/WidgetPickerModal";
import type { DashboardWidget } from "@/src/dashboard/widgetTypes";
import type { DashboardDataResponse } from "@/src/dashboard/dataTypes";
import { dashboardWidgetRegistry } from "@/src/dashboard/widgetRegistry";
import { normalizeWidgets } from "@/src/dashboard/normalizeWidgets";

const getCurrentMonth = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

type ApiItemResponse<T> = { data: T };

type DashboardConfigResponse = {
  widgets: DashboardWidget[];
  version: number;
};

const createWidgetId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const buildDefaultWidgets = (): DashboardWidget[] => [
  {
    id: createWidgetId(),
    type: "total_income",
    titleKey: "dashboard_widget_total_income",
    x: 0,
    y: 0,
    w: 4,
    h: 2,
    view: "card",
  },
  {
    id: createWidgetId(),
    type: "total_expense",
    titleKey: "dashboard_widget_total_expenses",
    x: 4,
    y: 0,
    w: 4,
    h: 2,
    view: "card",
  },
  {
    id: createWidgetId(),
    type: "net_cash_flow",
    titleKey: "dashboard_widget_net_cash_flow",
    x: 8,
    y: 0,
    w: 4,
    h: 2,
    view: "card",
  },
];

export function DashboardClient({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const initializedFromQuery = useRef(false);
  const initialLoadDone = useRef(false);
  const lastLoadedMonth = useRef<string | null>(null);
  const [month, setMonth] = useState(getCurrentMonth());
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (initializedFromQuery.current) return;
    const monthParam = searchParams.get("month");
    if (monthParam) {
      setMonth(monthParam);
    }
    initializedFromQuery.current = true;
  }, [searchParams]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [configResponse, dataResponse] = await Promise.all([
        getJSON<ApiItemResponse<DashboardConfigResponse>>("/api/dashboard/config"),
        getJSON<ApiItemResponse<DashboardDataResponse>>(`/api/dashboard/data?month=${month}`),
      ]);
      setWidgets(normalizeWidgets(configResponse.data.widgets));
      setData(dataResponse.data);
      lastLoadedMonth.current = month;
      initialLoadDone.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "dashboard_loading");
      setToast(message);
    } finally {
      initialLoadDone.current = true;
      setLoading(false);
    }
  }, [locale, month]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getJSON<ApiItemResponse<DashboardDataResponse>>(
        `/api/dashboard/data?month=${month}`
      );
      setData(response.data);
      lastLoadedMonth.current = month;
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "dashboard_loading");
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [locale, month]);

  useEffect(() => {
    if (!initializedFromQuery.current || initialLoadDone.current) return;
    void loadInitial();
  }, [loadInitial, month]);

  useEffect(() => {
    if (!initializedFromQuery.current || !initialLoadDone.current) return;
    if (lastLoadedMonth.current === month) return;
    void loadData();
  }, [loadData, month]);

  const existingTypes = useMemo(() => new Set(widgets.map((widget) => widget.type)), [widgets]);

  const handleLayoutChange = useCallback((layout: GridLayout) => {
    setWidgets((prev) =>
      prev.map((widget) => {
        const updated = layout.find((item) => item.i === widget.id);
        if (!updated) return widget;
        return {
          ...widget,
          x: Math.max(0, Math.floor(updated.x)),
          y: Math.max(0, Math.floor(updated.y)),
          w: Math.max(1, Math.floor(updated.w)),
          h: Math.max(1, Math.floor(updated.h)),
        };
      })
    );
  }, []);

  const handleViewChange = useCallback((id: string, view: DashboardWidget["view"]) => {
    setWidgets((prev) => prev.map((widget) => (widget.id === id ? { ...widget, view } : widget)));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== id));
  }, []);

  const handleAddWidget = useCallback(
    (definition: (typeof dashboardWidgetRegistry)[number]) => {
      const widget: DashboardWidget = {
        id: createWidgetId(),
        type: definition.type,
        titleKey: definition.titleKey,
        x: 0,
        y: 0,
        w: definition.defaultSize.w,
        h: definition.defaultSize.h,
        view: definition.defaultView,
        kind: definition.kind,
        limit: definition.supportedViews.includes("bar") || definition.supportedViews.includes("pie") ? 5 : undefined,
      };
      setWidgets((prev) => normalizeWidgets([...prev, widget]));
      setPickerOpen(false);
    },
    [setPickerOpen]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const sanitized = normalizeWidgets(widgets);
      await putJSON<ApiItemResponse<DashboardConfigResponse>>("/api/dashboard/config", {
        widgets: sanitized,
      });
      setWidgets(sanitized);
      setToast(t(locale, "dashboard_save_layout"));
      setEditMode(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "dashboard_save_layout");
      setToast(message);
    } finally {
      setSaving(false);
    }
  }, [locale, widgets]);

  const handleReset = useCallback(async () => {
    const defaults = buildDefaultWidgets();
    setWidgets(defaults);
    setSaving(true);
    try {
      await putJSON<ApiItemResponse<DashboardConfigResponse>>("/api/dashboard/config", {
        widgets: defaults,
      });
      setToast(t(locale, "dashboard_reset_default"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "dashboard_reset_default");
      setToast(message);
    } finally {
      setSaving(false);
    }
  }, [locale]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral">{t(locale, "dashboard_title")}</h1>
          <p className="mt-2 opacity-70">{t(locale, "dashboard_subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker
            locale={locale}
            month={month}
            label={t(locale, "dashboard_month")}
            helperText={formatMonthLabel(month, locale)}
            onChange={setMonth}
          />
          <button
            type="button"
            className={`btn ${editMode ? "btn-secondary" : "btn-outline"}`}
            onClick={() => setEditMode((prev) => !prev)}
          >
            {t(locale, "dashboard_customize")}
          </button>
            {editMode ? (
            <>
              <button type="button" className="btn btn-outline" onClick={() => setPickerOpen(true)}>
                {t(locale, "dashboard_add_widget")}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? t(locale, "dashboard_save_layout") : t(locale, "dashboard_save_layout")}
              </button>
              <button type="button" className="btn btn-outline" onClick={handleReset} disabled={saving}>
                {t(locale, "dashboard_reset_default")}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div className="alert alert-info">
          <span>{toast}</span>
          <button className="btn btn-outline btn-sm" onClick={() => setToast(null)}>
            {t(locale, "transactions_dismiss")}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm opacity-60">{t(locale, "dashboard_loading")}</p>
      ) : (
        <div className="w-full max-w-6xl mx-auto overflow-hidden">
          <WidgetGrid
            widgets={widgets}
            data={data}
            locale={locale}
            editMode={editMode}
            onLayoutChange={handleLayoutChange}
            onViewChange={handleViewChange}
            onRemove={handleRemove}
          />
        </div>
      )}

      <WidgetPickerModal
        open={pickerOpen}
        locale={locale}
        existingTypes={existingTypes}
        onClose={() => setPickerOpen(false)}
        onAdd={handleAddWidget}
      />
    </div>
  );
}
