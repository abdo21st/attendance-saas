"use client"

import { Label } from "@/components/ui/label"

const months = [
  { value: 1, label: "يناير" },
  { value: 2, label: "فبراير" },
  { value: 3, label: "مارس" },
  { value: 4, label: "أبريل" },
  { value: 5, label: "مايو" },
  { value: 6, label: "يونيو" },
  { value: 7, label: "يوليو" },
  { value: 8, label: "أغسطس" },
  { value: 9, label: "سبتمبر" },
  { value: 10, label: "أكتوبر" },
  { value: 11, label: "نوفمبر" },
  { value: 12, label: "ديسمبر" },
]

export function SummaryFilterControls({
  month,
  year,
  years,
}: {
  month: number
  year: number
  years: number[]
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>الشهر</Label>
        <select
          name="month"
          defaultValue={String(month)}
          onChange={(e) => {
            const url = new URL(window.location.href)
            url.searchParams.set("month", e.target.value)
            window.location.href = url.toString()
          }}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>السنة</Label>
        <select
          name="year"
          defaultValue={String(year)}
          onChange={(e) => {
            const url = new URL(window.location.href)
            url.searchParams.set("year", e.target.value)
            window.location.href = url.toString()
          }}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
