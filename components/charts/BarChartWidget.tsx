"use client";

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

type ChartThemeColors = {
  grid: string;
  muted: string;
  surface: string;
  text: string;
};

const fallbackColors: ChartThemeColors = {
  grid: "#1C3A2C",
  muted: "#9BB7A8",
  surface: "#0E2A1F",
  text: "#E6F2EC",
};

function getThemeColors(): ChartThemeColors {
  if (typeof window === "undefined") return fallbackColors;

  const styles = getComputedStyle(document.documentElement);
  const grid = styles.getPropertyValue("--color-base-300").trim();
  const muted = styles.getPropertyValue("--color-muted").trim();
  const surface = styles.getPropertyValue("--color-base-200").trim();
  const text = styles.getPropertyValue("--color-base-content").trim();

  return {
    grid: grid || fallbackColors.grid,
    muted: muted || fallbackColors.muted,
    surface: surface || fallbackColors.surface,
    text: text || fallbackColors.text,
  };
}

export function BarChartWidget({ data, xKey, bars, valueFormatter }: BarChartWidgetProps) {
  const colors = getThemeColors();

  if (data.length === 0) {
    return <p className="text-sm opacity-60">No data yet.</p>;
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
