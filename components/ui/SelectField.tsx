"use client";

import React from "react";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import {
  SELECT_ICON_WRAP,
  SELECT_WITH_ICON,
  SELECT_WRAP,
} from "@/components/ui/selectStyles";

export function SelectField(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  const { className, children, ...rest } = props;

  return (
    <div className={SELECT_WRAP}>
      <select className={`${SELECT_WITH_ICON} ${className ?? ""}`} {...rest}>
        {children}
      </select>
      <span className={SELECT_ICON_WRAP}>
        <ChevronDown className="h-4 w-4" />
      </span>
    </div>
  );
}
