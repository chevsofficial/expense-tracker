"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app/settings", label: "General" },
  { href: "/app/settings/categories", label: "Categories" },
  { href: "/app/settings/merchants", label: "Merchants" },
  { href: "/app/settings/import", label: "Imports" },
  { href: "/app/settings/about", label: "About" },
];

export function SettingsSideNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  const linkClass = (href: string) => {
    const active = isActive(href);
    return [
      "relative block px-3 py-2 text-sm font-light transition-colors",
      active ? "text-primary" : "text-[#7b93a4]",
      "hover:text-primary",
    ].join(" ");
  };

  const indicatorClass = (href: string) =>
    isActive(href) ? "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-primary" : "";

  return (
    <ul className="space-y-1 px-1">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className={`${linkClass(item.href)} ${indicatorClass(item.href)}`}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
