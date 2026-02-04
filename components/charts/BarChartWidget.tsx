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

export function BarChartWidget({ data, xKey, bars, valueFormatter }: BarChartWidgetProps) {
  if (data.length === 0) {
    return <p className="text-sm opacity-60">No data yet.</p>;
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => {
              if (value == null) return "";
              if (typeof value === "number") {
                return valueFormatter ? valueFormatter(value) : value.toLocaleString();
              }
              return value;
            }}
          />
          <Legend />
          {bars.map((bar) => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={bar.color} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
