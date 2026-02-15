import type { ReactNode } from "react";
import { CHIP_CLASS_NO_PADDING } from "@/components/ui/uiClasses";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className = "" }: SurfaceCardProps) {
  return <div className={`${CHIP_CLASS_NO_PADDING} ${className}`.trim()}>{children}</div>;
}

export function SurfaceCardBody({ children, className = "" }: SurfaceCardProps) {
  return <div className={`p-4 md:p-5 ${className}`.trim()}>{children}</div>;
}
