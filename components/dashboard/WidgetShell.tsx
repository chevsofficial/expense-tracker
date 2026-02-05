import type { ReactNode } from "react";
import type { Locale } from "@/src/i18n/messages";
import { t } from "@/src/i18n/t";
import type { DashboardWidgetView } from "@/src/dashboard/widgetTypes";

type WidgetShellProps = {
  title: string;
  locale: Locale;
  view: DashboardWidgetView;
  supportedViews: DashboardWidgetView[];
  editMode: boolean;
  onViewChange: (view: DashboardWidgetView) => void;
  onRemove?: () => void;
  children: ReactNode;
};

export function WidgetShell({
  title,
  locale,
  view,
  supportedViews,
  editMode,
  onViewChange,
  onRemove,
  children,
}: WidgetShellProps) {
  return (
    <div className="card h-full bg-base-100 border border-primary/20 shadow">
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-secondary/20">
        <h2
          className={`text-base font-semibold text-neutral ${
            editMode ? "widget-drag-handle cursor-move" : ""
          }`}
        >
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {supportedViews.length > 1 ? (
            <select
              className="select select-sm"
              value={view}
              onChange={(event) => onViewChange(event.target.value as DashboardWidgetView)}
            >
              {supportedViews.map((item) => (
                <option key={item} value={item}>
                  {t(locale, `dashboard_view_${item}`)}
                </option>
              ))}
            </select>
          ) : null}
          {editMode && onRemove ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm text-error"
              onClick={onRemove}
              aria-label="Remove widget"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>
      <div className="p-4 h-full flex flex-col">
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
}
