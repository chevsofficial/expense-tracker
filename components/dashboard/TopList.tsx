"use client";

type TopListItem = {
  id: string;
  label: string;
  value: string;
  count: number;
};

type TopListProps = {
  title: string;
  emptyLabel: string;
  items: TopListItem[];
  countLabel: string;
};

export function TopList({ title, emptyLabel, items, countLabel }: TopListProps) {
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="text-lg font-semibold">{title}</h2>
        {items.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate">{item.label}</p>
                  <p className="text-xs opacity-60">
                    {item.count} {countLabel}
                  </p>
                </div>
                <span className="font-medium">{item.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-60">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}
