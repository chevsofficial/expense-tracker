import type { ReactNode } from "react";
import { CHIP_CLASS } from "@/components/ui/uiClasses";

export function DataTable({
  title,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${CHIP_CLASS} ${className}`.trim()}>
      {title || actions ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {title ? <div className="text-sm font-semibold text-neutral">{title}</div> : <div />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="overflow-x-auto bg-transparent">{children}</div>
    </section>
  );
}
