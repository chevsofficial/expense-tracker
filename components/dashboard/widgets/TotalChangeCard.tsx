import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import { SurfaceCard, SurfaceCardBody } from "@/components/ui/SurfaceCard";

const formatCurrency = (locale: Locale, amountMinor: number, currency: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);

export function TotalChangeCard({
  locale,
  total,
  currency,
}: {
  locale: Locale;
  total: number;
  currency: string;
}) {
  const isPositive = total >= 0;

  return (
    <SurfaceCard className="col-span-12 md:col-span-6">
      <SurfaceCardBody>
        <h3 className="text-sm font-semibold uppercase opacity-60">
          {t(locale, "dashboard_total_change")}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm uppercase opacity-70">{currency}</span>
          <span className={`text-lg font-semibold ${isPositive ? "text-success" : "text-error"}`}>
            {formatCurrency(locale, total, currency)}
          </span>
        </div>
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
