"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  if (data.length === 0) {
    return <p className="text-sm opacity-60">No data yet.</p>;
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
          <Tooltip
            formatter={(value) => {
              if (value == null) return "";

              if (typeof value === "number") {
                return valueFormatter ? valueFormatter(value) : value.toLocaleString();
              }

              return value;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
