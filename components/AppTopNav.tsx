"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppTopNav({
  appName,
  dashboardLabel,
  accountsLabel,
  transactionsLabel,
  rightSlot,
}: {
  appName: string;
  dashboardLabel: string;
  accountsLabel: string;
  transactionsLabel: string;
  rightSlot?: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/app/settings"
      ? pathname.startsWith("/app/settings")
      : pathname === href;

  const linkClass = (href: string) => {
    const active = isActive(href);
    return [
      "relative px-3 py-2 text-sm",
      "font-light",
      "transition-colors",
      active ? "text-primary" : "text-[#7b93a4]",
      "hover:text-primary",
    ].join(" ");
  };

  const underlineClass = (href: string) =>
    isActive(href)
      ? "after:content-[''] after:absolute after:left-2 after:right-2 after:-bottom-1 after:h-[2px] after:bg-primary"
      : "";

  return (
    <div className="navbar bg-white text-base-content border-b border-base-300">
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
              <Link href="/app/settings">Settings</Link>
            </li>
          </ul>
        </div>
        <Link href="/app/dashboard" className="flex items-center gap-2 px-2 py-2" aria-label={appName}>
          <img src="/brand/spendary-logo.svg" alt="Spendary" className="h-8 w-auto" />
        </Link>
      </div>
      <div className="navbar-center hidden sm:flex">
        <ul className="flex items-center gap-1">
          <li>
            <Link
              href="/app/dashboard"
              className={`${linkClass("/app/dashboard")} ${underlineClass("/app/dashboard")}`}
            >
              {dashboardLabel}
            </Link>
          </li>
          <li>
            <Link
              href="/app/accounts"
              className={`${linkClass("/app/accounts")} ${underlineClass("/app/accounts")}`}
            >
              {accountsLabel}
            </Link>
          </li>
          <li>
            <Link
              href="/app/transactions"
              className={`${linkClass("/app/transactions")} ${underlineClass("/app/transactions")}`}
            >
              {transactionsLabel}
            </Link>
          </li>
          <li>
            <Link
              href="/app/settings"
              className={`${linkClass("/app/settings")} ${underlineClass("/app/settings")}`}
            >
              Settings
            </Link>
          </li>
        </ul>
      </div>
      <div className="navbar-end gap-2">{rightSlot}</div>
    </div>
  );
}
