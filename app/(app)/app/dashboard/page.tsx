const stats = [
  {
    label: "Total spend",
    value: "$1,240",
    detail: "Last 30 days",
  },
  {
    label: "Remaining budget",
    value: "$860",
    detail: "Across 5 categories",
  },
  {
    label: "Upcoming bills",
    value: "$320",
    detail: "Due this week",
  },
];

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="opacity-70 mt-2">
          Track your spending at a glance and keep budgets on target.
        </p>
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
          <h2 className="text-xl font-semibold">Next steps</h2>
          <ul className="list-disc pl-5 space-y-2 opacity-80">
            <li>Review category budgets to keep overspending in check.</li>
            <li>Connect recurring bills to stay ahead of due dates.</li>
            <li>Set monthly savings goals for larger purchases.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
