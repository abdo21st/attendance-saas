"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ChartData {
  month: string
  total: number
}

export function DashboardChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => value.toLocaleString()}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            background: "var(--popover)",
          }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--color-primary)" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
