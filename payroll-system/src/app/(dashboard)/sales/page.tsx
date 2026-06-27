"use client"

import { useState, useEffect, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SaveIcon, TrashIcon } from "lucide-react"
import { getSalesList, saveMonthlySales, deleteMonthlySales } from "./actions"

interface MonthlySale {
  id: string
  employeeId: string
  totalSales: number
  employeeSales: number
  salesRatio: number
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeCode: string
    salesTarget: number
    department: { name: string }
  }
}

const months = [
  { value: 1, label: "يناير" }, { value: 2, label: "فبراير" },
  { value: 3, label: "مارس" }, { value: 4, label: "أبريل" },
  { value: 5, label: "مايو" }, { value: 6, label: "يونيو" },
  { value: 7, label: "يوليو" }, { value: 8, label: "أغسطس" },
  { value: 9, label: "سبتمبر" }, { value: 10, label: "أكتوبر" },
  { value: 11, label: "نوفمبر" }, { value: 12, label: "ديسمبر" },
]

export default function SalesPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [sales, setSales] = useState<MonthlySale[]>([])
  const [employees, setEmployees] = useState<MonthlySale["employee"][]>([])
  const [values, setValues] = useState<Record<string, { totalSales: string; employeeSales: string }>>({})
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        const mapped = data.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          firstName: e.firstName as string,
          lastName: e.lastName as string,
          employeeCode: e.employeeCode as string,
          salesTarget: Number(e.salesTarget),
          department: (e as { department: { name: string } }).department,
        }))
        setEmployees(mapped)
        const defaults: Record<string, { totalSales: string; employeeSales: string }> = {}
        for (const emp of mapped) {
          defaults[emp.id] = { totalSales: "", employeeSales: "" }
        }
        setValues(defaults)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getSalesList(month, year)
        setSales(data)
        const v = { ...values }
        for (const s of data) {
          v[s.employeeId] = { totalSales: String(s.totalSales), employeeSales: String(s.employeeSales) }
        }
        setValues(v)
      } catch { }
    })
  }, [month, year])

  const existingIds = new Set(sales.map((s) => s.employeeId))

  function handleSave(employeeId: string) {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("employeeId", employeeId)
      formData.append("month", String(month))
      formData.append("year", String(year))
      formData.append("totalSales", values[employeeId]?.totalSales || "0")
      formData.append("employeeSales", values[employeeId]?.employeeSales || "0")
      try {
        await saveMonthlySales(formData)
        const data = await getSalesList(month, year)
        setSales(data)
      } catch { }
    })
  }

  function handleDelete(employeeId: string) {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("employeeId", employeeId)
      formData.append("month", String(month))
      formData.append("year", String(year))
      try {
        await deleteMonthlySales(formData)
        setSales((prev) => prev.filter((s) => s.employeeId !== employeeId))
      } catch { }
    })
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">المبيعات الشهرية</h1>
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إدخال المبيعات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الموظف</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>هدف المبيعات</TableHead>
                <TableHead>إجمالي المبيعات</TableHead>
                <TableHead>مبيعات الموظف</TableHead>
                <TableHead>نسبة التحقيق</TableHead>
                <TableHead className="w-32">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => {
                const existing = sales.find((s) => s.employeeId === emp.id)
                const ratio = existing?.salesRatio ?? 0
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
                    <TableCell>{emp.firstName} {emp.lastName}</TableCell>
                    <TableCell>{emp.department.name}</TableCell>
                    <TableCell>{Number(emp.salesTarget).toFixed(2)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-8 w-28"
                        value={values[emp.id]?.totalSales ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [emp.id]: { ...prev[emp.id], totalSales: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-8 w-28"
                        value={values[emp.id]?.employeeSales ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [emp.id]: { ...prev[emp.id], employeeSales: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {existing ? (
                        <Badge variant={ratio >= 1 ? "default" : "secondary"}>
                          {(ratio * 100).toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleSave(emp.id)}
                          disabled={pending}
                        >
                          <SaveIcon className="size-4" />
                        </Button>
                        {existing && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDelete(emp.id)}
                            disabled={pending}
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
