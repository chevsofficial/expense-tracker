"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  getFallbackChartThemeColors,
  readChartThemeColors,
  type ChartThemeColors,
} from "@/src/theme/chartTheme";

const COLORS = ["#6DBE45", "#2F6F2E", "#F4C430", "#4B9CE2", "#E15B64", "#9C7BD7"];

export type PieChartDatum = {
  name: string;
  value: number;
  color?: string;
};

type PieChartWidgetProps = {
  data: PieChartDatum[];
  valueFormatter?: (value: number) => string;
};

export function PieChartWidget({ data, valueFormatter }: PieChartWidgetProps) {
  const [colors, setColors] = useState<ChartThemeColors>(getFallbackChartThemeColors());

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setColors(readChartThemeColors());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (data.length === 0) {
    return <p className="text-sm text-[var(--color-muted)]">No data yet.</p>;
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={80}>
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={entry.color ?? COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend wrapperStyle={{ color: colors.muted }} />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.surface,
              borderColor: colors.grid,
              color: colors.text,
            }}
            labelStyle={{ color: colors.muted }}
            formatter={(value) =>
              valueFormatter ? valueFormatter(Number(value ?? 0)) : String(value ?? 0)
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
