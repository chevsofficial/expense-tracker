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

  return (
    <ul className="menu px-1">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={[
                "rounded-lg",
                isActive ? "bg-primary text-primary-content" : "hover:bg-base-300/60",
              ].join(" ")}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
