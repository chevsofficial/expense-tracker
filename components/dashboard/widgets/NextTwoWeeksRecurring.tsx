import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import { formatDateOnly } from "@/src/utils/dateOnly";
import { SurfaceCard, SurfaceCardBody } from "@/components/ui/SurfaceCard";

const formatCurrency = (locale: Locale, amountMinor: number, currency: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);

type RecurringItem = {
  recurringId: string;
  title: string;
  nextDate: string;
  amountMinor: number;
  currency: string;
  kind: "income" | "expense";
  merchantName?: string | null;
  categoryName?: string | null;
  categoryEmoji?: string | null;
};

type NextTwoWeeksRecurringProps = {
  locale: Locale;
  data: {
    from: string;
    to: string;
    items: RecurringItem[];
  } | null;
  loading: boolean;
  className?: string;
};

export function NextTwoWeeksRecurring({
  locale,
  data,
  loading,
  className,
}: NextTwoWeeksRecurringProps) {
  return (
    <SurfaceCard className={`col-span-12 ${className ?? ""}`}>
      <SurfaceCardBody className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase opacity-60">
            {t(locale, "dashboard_next_two_weeks")}
          </h3>
          {data ? (
            <p className="text-xs opacity-60">
              {formatDateOnly(data.from, locale)} → {formatDateOnly(data.to, locale)}
            </p>
          ) : null}
        </div>

        {loading ? <p className="text-sm opacity-70">{t(locale, "dashboard_loading")}</p> : null}

        {data && data.items.length === 0 && !loading ? (
          <p className="text-sm opacity-70">{t(locale, "dashboard_recurring_empty")}</p>
        ) : null}

        {data && data.items.length > 0 ? (
          <div className="space-y-3">
            {data.items.map((item) => (
              <div
                key={item.recurringId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-base-300 p-3"
              >
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm opacity-70">
                    {formatDateOnly(item.nextDate, locale)}
                    {item.categoryName ? (
                      <span>
                        {" "}•{" "}
                        {item.categoryEmoji ? `${item.categoryEmoji} ` : ""}
                        {item.categoryName}
                      </span>
                    ) : null}
                    {item.merchantName ? <span>{" "}• {item.merchantName}</span> : null}
                  </p>
                </div>
                <div className={`text-right text-lg font-semibold ${item.kind === "income" ? "text-success" : "text-error"}`}>
                  {formatCurrency(locale, item.amountMinor, item.currency)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
