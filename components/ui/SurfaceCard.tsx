import type { ReactNode } from "react";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className = "" }: SurfaceCardProps) {
  return (
    <div className={`bg-base-200 border border-base-300 rounded-xl ${className}`.trim()}>
      {children}
    </div>
  );
}

export function SurfaceCardBody({ children, className = "" }: SurfaceCardProps) {
  return <div className={`p-4 md:p-5 ${className}`.trim()}>{children}</div>;
}
