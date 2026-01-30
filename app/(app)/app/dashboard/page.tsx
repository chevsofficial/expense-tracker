import { getLocale } from "@/src/i18n/getLocale";
import { t } from "@/src/i18n/t";

export default async function DashboardPage() {
  const locale = await getLocale();
  const stats = [
    {
      label: t(locale, "dashboard_total_spend"),
      value: "$1,240",
      detail: t(locale, "dashboard_last_30_days"),
    },
    {
      label: t(locale, "dashboard_remaining_budget"),
      value: "$860",
      detail: t(locale, "dashboard_across_categories"),
    },
    {
      label: t(locale, "dashboard_upcoming_bills"),
      value: "$320",
      detail: t(locale, "dashboard_due_this_week"),
    },
  ];

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{t(locale, "dashboard_title")}</h1>
        <p className="mt-2 opacity-70">{t(locale, "dashboard_subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card bg-base-100 shadow">
            <div className="card-body">
              <p className="text-sm uppercase tracking-wide opacity-60">
                {stat.label}
              </p>
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="text-sm opacity-70">{stat.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="text-xl font-semibold">{t(locale, "dashboard_next_steps")}</h2>
          <ul className="list-disc space-y-2 pl-5 opacity-80">
            <li>{t(locale, "dashboard_next_step_one")}</li>
            <li>{t(locale, "dashboard_next_step_two")}</li>
            <li>{t(locale, "dashboard_next_step_three")}</li>
          </ul>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <p className="font-medium">Theme check: primary + base colors</p>
            <button className="btn btn-primary btn-sm" type="button">
              Primary
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
