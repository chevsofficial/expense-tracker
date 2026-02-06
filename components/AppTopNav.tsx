"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppTopNav({
  appName,
  dashboardLabel,
  categoriesLabel,
  accountsLabel,
  merchantsLabel,
  importLabel,
  transactionsLabel,
  budgetLabel,
  recurringLabel,
  rightSlot,
}: {
  appName: string;
  dashboardLabel: string;
  categoriesLabel: string;
  accountsLabel: string;
  merchantsLabel: string;
  importLabel?: string;
  transactionsLabel: string;
  budgetLabel: string;
  recurringLabel: string;
  rightSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const linkClass = (href: string) =>
    `btn btn-ghost text-primary-content ${pathname === href ? "bg-primary-content/15" : ""}`;

  return (
    <div className="navbar bg-primary text-primary-content">
      <div className="navbar-start">
        <div className="dropdown sm:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost">
            ☰
          </div>
          <ul
            tabIndex={0}
            className="menu dropdown-content mt-3 w-52 rounded-box bg-primary text-primary-content shadow"
          >
            <li>
              <Link href="/app/dashboard">{dashboardLabel}</Link>
            </li>
            <li>
              <Link href="/app/settings">Settings</Link>
            </li>
            <li>
              <Link href="/app/settings/categories">{categoriesLabel}</Link>
            </li>
            <li>
              <Link href="/app/settings/accounts">{accountsLabel}</Link>
            </li>
            <li>
              <Link href="/app/settings/merchants">{merchantsLabel}</Link>
            </li>
            {importLabel ? (
              <li>
                <Link href="/app/settings/import">{importLabel}</Link>
              </li>
            ) : null}
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
        <Link href="/app/dashboard" className="btn btn-ghost text-xl text-primary-content">
          {appName}
        </Link>
      </div>
      <div className="navbar-center hidden sm:flex">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link href="/app/dashboard" className={linkClass("/app/dashboard")}>
              {dashboardLabel}
            </Link>
          </li>
          <li>
            <Link href="/app/settings" className={linkClass("/app/settings")}>
              Settings
            </Link>
          </li>
          <li>
            <Link href="/app/settings/categories" className={linkClass("/app/settings/categories")}>
              {categoriesLabel}
            </Link>
          </li>
          <li>
            <Link href="/app/settings/accounts" className={linkClass("/app/settings/accounts")}>
              {accountsLabel}
            </Link>
          </li>
          <li>
            <Link href="/app/settings/merchants" className={linkClass("/app/settings/merchants")}>
              {merchantsLabel}
            </Link>
          </li>
          {importLabel ? (
            <li>
              <Link href="/app/settings/import" className={linkClass("/app/settings/import")}>
                {importLabel}
              </Link>
            </li>
          ) : null}
          <li>
            <Link href="/app/transactions" className={linkClass("/app/transactions")}>
              {transactionsLabel}
            </Link>
          </li>
          <li>
            <Link href="/app/budget" className={linkClass("/app/budget")}>
              {budgetLabel}
            </Link>
          </li>
          <li>
            <Link href="/app/recurring" className={linkClass("/app/recurring")}>
              {recurringLabel}
            </Link>
          </li>
        </ul>
      </div>
      <div className="navbar-end gap-2">{rightSlot}</div>
    </div>
  );
}
