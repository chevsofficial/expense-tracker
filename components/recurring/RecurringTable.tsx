"use client";

import { RecurringActions } from "@/components/recurring/RecurringActions";
import { formatCurrency } from "@/src/lib/format";
import { formatDateOnly } from "@/src/utils/dateOnly";
import type { Locale } from "@/src/i18n/messages";

type RecurringItem = {
  _id: string;
  name: string;
  amountMinor: number;
  currency: string;
  kind: "expense" | "income";
  categoryId?: string | null;
  merchantId?: string | null;
  schedule: {
    frequency: "monthly" | "weekly";
    interval: number;
    dayOfMonth?: number;
  };
  startDate: string;
  nextRunOn: string;
  isArchived: boolean;
};

type RecurringTableProps = {
  items: RecurringItem[];
  locale: Locale;
  statusValue: string;
  labels: {
    name: string;
    amount: string;
    category: string;
    merchant: string;
    schedule: string;
    nextRun: string;
    status: string;
    edit: string;
    archive: string;
    restore: string;
    delete: string;
  };
  categoryMap: Map<string, string>;
  merchantMap: Map<string, string>;
  scheduleLabel: (item: RecurringItem) => string;
  onEdit: (item: RecurringItem) => void;
  onArchive: (item: RecurringItem) => void;
  onRestore: (item: RecurringItem) => void;
  onDelete: (item: RecurringItem) => void;
};

export function RecurringTable({
  items,
  locale,
  statusValue,
  labels,
  categoryMap,
  merchantMap,
  scheduleLabel,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: RecurringTableProps) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table className="table">
        <thead>
          <tr>
            <th>{labels.name}</th>
            <th>{labels.amount}</th>
            <th>{labels.category}</th>
            <th>{labels.merchant}</th>
            <th>{labels.schedule}</th>
            <th>{labels.nextRun}</th>
            <th>{labels.status}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id} className={item.isArchived ? "opacity-60" : ""}>
              <td>{item.name}</td>
              <td>{formatCurrency(item.amountMinor, item.currency, locale)}</td>
              <td>{item.categoryId ? categoryMap.get(item.categoryId) : "-"}</td>
              <td>{item.merchantId ? merchantMap.get(item.merchantId) : "-"}</td>
              <td>{scheduleLabel(item)}</td>
              <td>{formatDateOnly(item.nextRunOn, locale)}</td>
              <td>{statusValue}</td>
              <td>
                <RecurringActions
                  isArchived={item.isArchived}
                  onEdit={() => onEdit(item)}
                  onArchive={() => onArchive(item)}
                  onRestore={() => onRestore(item)}
                  onDelete={() => onDelete(item)}
                  labels={{
                    edit: labels.edit,
                    archive: labels.archive,
                    restore: labels.restore,
                    delete: labels.delete,
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
