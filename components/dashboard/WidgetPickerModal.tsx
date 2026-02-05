import { Modal } from "@/components/ui/Modal";
import { dashboardWidgetRegistry } from "@/src/dashboard/widgetRegistry";
import type { DashboardWidgetDefinition } from "@/src/dashboard/widgetRegistry";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type WidgetPickerModalProps = {
  open: boolean;
  locale: Locale;
  existingTypes: Set<string>;
  onClose: () => void;
  onAdd: (definition: DashboardWidgetDefinition) => void;
};

export function WidgetPickerModal({
  open,
  locale,
  existingTypes,
  onClose,
  onAdd,
}: WidgetPickerModalProps) {
  return (
    <Modal open={open} title={t(locale, "dashboard_add_widget")} onClose={onClose}>
      <div className="space-y-3">
        {dashboardWidgetRegistry.map((widget) => {
          const disabled = existingTypes.has(widget.type);
          return (
            <div
              key={widget.type}
              className="flex items-center justify-between gap-4 rounded-lg border border-base-200 bg-base-100 p-3"
            >
              <div>
                <p className="font-medium">{t(locale, widget.titleKey)}</p>
                <p className="text-xs opacity-60">{widget.type.replace(/_/g, " ")}</p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => onAdd(widget)}
                disabled={disabled}
              >
                {t(locale, "dashboard_add_widget")}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
