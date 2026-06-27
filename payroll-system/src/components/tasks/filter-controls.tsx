"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Label } from "@/components/ui/label"

interface FilterControlsProps {
  months: { value: number; label: string }[]
  years: number[]
  departments: { id: string; name: string }[]
  statusOptions: { value: string; label: string }[]
  defaultValues: {
    month: string
    year: string
    departmentId: string
    status: string
  }
}

export function TaskFilterControls({
  months,
  years,
  departments,
  statusOptions,
  defaultValues,
}: FilterControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>الشهر</Label>
        <select
          defaultValue={defaultValues.month}
          onChange={(e) => updateParams("month", e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>السنة</Label>
        <select
          defaultValue={defaultValues.year}
          onChange={(e) => updateParams("year", e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>القسم</Label>
        <select
          defaultValue={defaultValues.departmentId}
          onChange={(e) => updateParams("departmentId", e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">الكل</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>الحالة</Label>
        <select
          defaultValue={defaultValues.status}
          onChange={(e) => updateParams("status", e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">الكل</option>
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}