import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import { SurfaceCard, SurfaceCardBody } from "@/components/ui/SurfaceCard";

const formatCurrency = (locale: Locale, amountMinor: number, currency: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);

export function TotalIncomeCard({
  locale,
  totals,
}: {
  locale: Locale;
  totals: Record<string, number>;
}) {
  const entries = Object.entries(totals);

  return (
    <SurfaceCard className="col-span-12 md:col-span-6">
      <SurfaceCardBody>
        <h3 className="text-sm font-semibold uppercase opacity-60">
          {t(locale, "dashboard_total_income")}
        </h3>
        {entries.length === 0 ? (
          <p className="text-sm opacity-70">{t(locale, "dashboard_no_activity")}</p>
        ) : (
          <div className="space-y-2">
            {entries.map(([currency, amount]) => (
              <div key={currency} className="flex items-center justify-between">
                <span className="text-sm uppercase opacity-70">{currency}</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(locale, amount, currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
