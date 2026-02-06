import type { ReactNode } from "react";

export function DashboardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-12 gap-4">{children}</div>;
}
