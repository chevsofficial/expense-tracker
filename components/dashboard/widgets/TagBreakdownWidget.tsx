"use client";

import { SurfaceCard, SurfaceCardBody } from "@/components/ui/SurfaceCard";
import type { Locale } from "@/src/i18n/messages";

export type TagBreakdownRow = {
  tagId: string;
  name: string;
  color?: string | null;
  totalMinor: number;
  count: number;
};

const formatCurrency = (locale: Locale, amountMinor: number, currency: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountMinor / 100);

export function TagBreakdownWidget({
  locale,
  title,
  rows,
  currency,
}: {
  locale: Locale;
  title: string;
  rows: TagBreakdownRow[];
  currency: string;
}) {
  return (
    <SurfaceCard className="col-span-12 lg:col-span-6">
      <SurfaceCardBody className="space-y-3">
        <h3 className="text-sm font-semibold uppercase opacity-60">{title}</h3>
        {rows.length === 0 ? <p className="text-sm opacity-70">No tag data.</p> : null}
        {rows.map((row) => (
          <div key={row.tagId} className="flex items-center justify-between border-b border-base-300 pb-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: row.color || "#94a3b8" }} />
              <span>{row.name}</span>
            </div>
            <span>{formatCurrency(locale, row.totalMinor, currency)}</span>
          </div>
        ))}
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
