"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  getFallbackChartThemeColors,
  readChartThemeColors,
  type ChartThemeColors,
} from "@/src/theme/chartTheme";

type BarDefinition = {
  key: string;
  label: string;
  color: string;
};

type BarChartWidgetProps = {
  data: Array<Record<string, string | number>>;
  xKey: string;
  bars: BarDefinition[];
  valueFormatter?: (value: number) => string;
};

export function BarChartWidget({ data, xKey, bars, valueFormatter }: BarChartWidgetProps) {
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
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fill: colors.muted, fontSize: 12 }} />
          <YAxis tick={{ fill: colors.muted, fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.surface,
              borderColor: colors.grid,
              color: colors.text,
            }}
            labelStyle={{ color: colors.muted }}
            formatter={(value) => {
              if (value == null) return "";
              if (typeof value === "number") {
                return valueFormatter ? valueFormatter(value) : value.toLocaleString();
              }
              return value;
            }}
          />
          <Legend wrapperStyle={{ color: colors.muted }} />
          {bars.map((bar) => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={bar.color} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
