import { getLocale } from "@/src/i18n/getLocale";
import { t } from "@/src/i18n/t";
import { requireAuthContext } from "@/src/server/api";
import { TransactionModel } from "@/src/models/Transaction";

export default async function DashboardPage() {
  const locale = await getLocale();
  const auth = await requireAuthContext();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(start);

  let totalSpendMinor = 0;
  let totalIncomeMinor = 0;
  let currency = "MXN";

  if (!("response" in auth)) {
    currency = auth.workspace.defaultCurrency;
    const transactions = await TransactionModel.find({
      workspaceId: auth.workspace.id,
      date: { $gte: start, $lt: end },
      isArchived: false,
    }).lean();

    for (const transaction of transactions) {
      if (transaction.kind === "expense") {
        totalSpendMinor += transaction.amountMinor;
      } else {
        totalIncomeMinor += transaction.amountMinor;
      }
    }
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  });
  const netMinor = totalIncomeMinor - totalSpendMinor;

  const stats = [
    {
      label: t(locale, "dashboard_spend"),
      value: formatter.format(totalSpendMinor / 100),
      detail: monthLabel,
    },
    {
      label: t(locale, "dashboard_income"),
      value: formatter.format(totalIncomeMinor / 100),
      detail: monthLabel,
    },
    {
      label: t(locale, "dashboard_net"),
      value: formatter.format(netMinor / 100),
      detail: monthLabel,
    },
    {
      label: t(locale, "dashboard_remaining_budget"),
      value: "—",
      detail: t(locale, "dashboard_across_categories"),
    },
  ];

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{t(locale, "dashboard_title")}</h1>
        <p className="mt-2 opacity-70">{t(locale, "dashboard_subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
