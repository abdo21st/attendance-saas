"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface ChartData {
  name: string
  averageCompletion: number
  averageQuality: number
  performanceScore: number
  performanceFactor: number
}

export function PerformanceChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            background: "var(--popover)",
          }}
        />
        <Legend />
        <Bar
          dataKey="averageCompletion"
          name="متوسط الإنجاز"
          fill="var(--color-chart-1)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="averageQuality"
          name="متوسط الجودة"
          fill="var(--color-chart-2)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="performanceScore"
          name="درجة الأداء"
          fill="var(--color-chart-3)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
