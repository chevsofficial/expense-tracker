import Link from "next/link";

export function AppTopNav({
  appName,
  dashboardLabel,
  categoriesLabel,
  merchantsLabel,
  transactionsLabel,
  budgetLabel,
  recurringLabel,
  rightSlot,
}: {
  appName: string;
  dashboardLabel: string;
  categoriesLabel: string;
  merchantsLabel: string;
  transactionsLabel: string;
  budgetLabel: string;
  recurringLabel: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="navbar border-b border-base-200 bg-base-100">
      <div className="navbar-start">
        <Link href="/app/dashboard" className="btn btn-ghost text-xl">
          {appName}
        </Link>
      </div>
      <div className="navbar-center hidden sm:flex">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link href="/app/dashboard">{dashboardLabel}</Link>
          </li>
          <li>
            <Link href="/app/settings/categories">{categoriesLabel}</Link>
          </li>
          <li>
            <Link href="/app/settings/merchants">{merchantsLabel}</Link>
          </li>
          <li>
            <Link href="/app/transactions">{transactionsLabel}</Link>
          </li>
          <li>
            <Link href="/app/budget">{budgetLabel}</Link>
          </li>
          <li>
            <Link href="/app/recurring">{recurringLabel}</Link>
          </li>
        </ul>
      </div>
      <div className="navbar-end gap-2">{rightSlot}</div>
    </div>
  );
}
