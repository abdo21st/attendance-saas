"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PlusIcon, TrashIcon, StarIcon, SaveIcon } from "lucide-react"
import { savePayrollEntry } from "../actions"

interface Employee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  department: { name: string }
}

interface TaskRow {
  id: string
  taskName: string
  description: string
  hours: string
  amount: string
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 transition-colors hover:text-yellow-400"
        >
          <StarIcon
            className={`size-5 ${
              star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
      <span className="mr-2 min-w-8 text-sm font-mono">{value}/10</span>
    </div>
  )
}

export default function PayrollEntryPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState("")
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [actualHours, setActualHours] = useState("")
  const [overtimeHours, setOvertimeHours] = useState("0")
  const [commitmentScore, setCommitmentScore] = useState(5)
  const [conductScore, setConductScore] = useState(5)
  const [salesTargetReached, setSalesTargetReached] = useState(false)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then(setEmployees)
      .catch(() => {})
  }, [])

  function addTask() {
    setTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), taskName: "", description: "", hours: "", amount: "" },
    ])
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function updateTask(id: string, field: keyof TaskRow, value: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData(e.currentTarget)
      for (const task of tasks) {
        formData.append("taskName", task.taskName)
        formData.append("taskDescription", task.description)
        formData.append("taskHours", task.hours)
        formData.append("taskAmount", task.amount)
      }
      await savePayrollEntry(formData)
      router.push(`/payroll?month=${month}&year=${year}`)
    } finally {
      setSaving(false)
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

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">إدخال بيانات المرتبات</h1>

      <form onSubmit={handleSubmit}>
        <input type="hidden" name="employeeId" value={employeeId} />
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="commitmentScore" value={commitmentScore} />
        <input type="hidden" name="conductScore" value={conductScore} />
        <input type="hidden" name="salesTargetReached" value={salesTargetReached ? "on" : "off"} />
        <input type="hidden" name="notes" value={notes} />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>بيانات الموظف</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>الموظف</Label>
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">اختر موظف...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeCode} — {emp.firstName} {emp.lastName} ({emp.department.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>الشهر</Label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
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
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>ساعات العمل</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>الساعات الفعلية</Label>
              <Input
                name="actualHours"
                type="number"
                step="0.5"
                min="0"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>الساعات الإضافية</Label>
              <Input
                name="overtimeHours"
                type="number"
                step="0.5"
                min="0"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>التقييمات</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>تقييم الالتزام</Label>
              <StarRating value={commitmentScore} onChange={setCommitmentScore} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>تقييم السلوك</Label>
              <StarRating value={conductScore} onChange={setConductScore} />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="salesTargetReached"
                checked={salesTargetReached}
                onChange={(e) => setSalesTargetReached(e.target.checked)}
                className="size-4 rounded border-input"
              />
              تم تحقيق هدف المبيعات
            </label>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>المهام الإضافية</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addTask}>
                <PlusIcon /> إضافة مهمة
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">لم تضف أي مهام إضافية بعد</p>
            )}
            {tasks.map((task) => (
              <div key={task.id} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-4">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Label className="text-xs">اسم المهمة</Label>
                  <Input
                    placeholder="اسم المهمة"
                    value={task.taskName}
                    onChange={(e) => updateTask(task.id, "taskName", e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">الساعات</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0"
                    value={task.hours}
                    onChange={(e) => updateTask(task.id, "hours", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">المبلغ</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={task.amount}
                      onChange={(e) => updateTask(task.id, "amount", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-destructive"
                      onClick={() => removeTask(task.id)}
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>ملاحظات</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="أي ملاحظات إضافية..."
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            إلغاء
          </Button>
          <Button type="submit" disabled={saving || !employeeId}>
            <SaveIcon /> {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </Button>
        </div>
      </form>
    </div>
  )
}
