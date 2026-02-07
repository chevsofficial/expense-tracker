"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppTopNav({
  appName,
  dashboardLabel,
  accountsLabel,
  transactionsLabel,
  budgetLabel,
  recurringLabel,
  rightSlot,
}: {
  appName: string;
  dashboardLabel: string;
  accountsLabel: string;
  transactionsLabel: string;
  budgetLabel: string;
  recurringLabel: string;
  rightSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const linkClass = (href: string) => {
    const isActive = href === "/app/settings" ? pathname.startsWith("/app/settings") : pathname === href;
    return [
      "btn btn-ghost",
      "text-base-content",
      "hover:bg-base-300/60",
      isActive ? "bg-primary text-primary-content hover:bg-primary" : "",
    ].join(" ");
  };

  return (
    <div className="navbar bg-base-200 text-base-content border-b border-base-300">
      <div className="navbar-start">
        <div className="dropdown sm:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost">
            ☰
          </div>
          <ul
            tabIndex={0}
            className="menu dropdown-content mt-3 w-52 rounded-box bg-base-200 text-base-content shadow"
          >
            <li>
              <Link href="/app/dashboard">{dashboardLabel}</Link>
            </li>
            <li>
              <Link href="/app/accounts">{accountsLabel}</Link>
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
            <li>
              <Link href="/app/settings">Settings</Link>
            </li>
          </ul>
        </div>
        <Link href="/app/dashboard" className="btn btn-ghost text-xl text-base-content">
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
            <Link href="/app/accounts" className={linkClass("/app/accounts")}>
              {accountsLabel}
            </Link>
          </li>
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
          <li>
            <Link href="/app/settings" className={linkClass("/app/settings")}>
              Settings
            </Link>
          </li>
        </ul>
      </div>
      <div className="navbar-end gap-2">{rightSlot}</div>
    </div>
  );
}
