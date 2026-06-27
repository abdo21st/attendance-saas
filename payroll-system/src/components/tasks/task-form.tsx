"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { createTaskReport, updateTaskReport } from "@/app/(dashboard)/tasks/actions"

type Employee = { id: string; firstName: string; lastName: string }

export function TaskForm({
  employees,
  report,
  defaultMonth,
  defaultYear,
}: {
  employees: Employee[]
  report?: {
    id: string
    employeeId: string
    taskName: string
    taskDescription: string | null
    taskCategory: string | null
    plannedHours: number
    actualHours: number
    completionPercent: number
    qualityScore: number
    employeeNotes: string | null
    reportMonth: number
    reportYear: number
  }
  defaultMonth?: number
  defaultYear?: number
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const action = report ? updateTaskReport : createTaskReport

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    startTransition(async () => {
      await action(new FormData(form))
      setOpen(false)
    })
  }

  const now = new Date()

  return (
    <>
      {!report && (
        <Button onClick={() => setOpen(true)}>
          <span className="ml-1">+</span> إضافة تقرير
        </Button>
      )}
      {report && (
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {report ? "تعديل تقرير المهمة" : "إضافة تقرير مهمة جديد"}
            </DialogTitle>
            <DialogDescription>
              {report ? "تعديل بيانات تقرير المهمة" : "إدخال بيانات المهمة"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            {report && <input type="hidden" name="id" value={report.id} />}
            <input type="hidden" name="reportMonth" value={report?.reportMonth ?? defaultMonth ?? now.getMonth() + 1} />
            <input type="hidden" name="reportYear" value={report?.reportYear ?? defaultYear ?? now.getFullYear()} />
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="employeeId">الموظف</Label>
                <Select
                  name="employeeId"
                  defaultValue={report?.employeeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الموظف" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="taskName">اسم المهمة</Label>
                <Input
                  id="taskName"
                  name="taskName"
                  defaultValue={report?.taskName}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="taskDescription">وصف المهمة</Label>
                <Textarea
                  id="taskDescription"
                  name="taskDescription"
                  defaultValue={report?.taskDescription ?? ""}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="taskCategory">التصنيف</Label>
                <Select
                  name="taskCategory"
                  defaultValue={report?.taskCategory ?? undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="اداري">إداري</SelectItem>
                    <SelectItem value="فني">فني</SelectItem>
                    <SelectItem value="مبيعات">مبيعات</SelectItem>
                    <SelectItem value="انتاج">إنتاج</SelectItem>
                    <SelectItem value="صيانة">صيانة</SelectItem>
                    <SelectItem value="اخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="plannedHours">الساعات المخططة</Label>
                  <Input
                    id="plannedHours"
                    name="plannedHours"
                    type="number"
                    step="0.5"
                    defaultValue={report?.plannedHours ?? 0}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="actualHours">الساعات الفعلية</Label>
                  <Input
                    id="actualHours"
                    name="actualHours"
                    type="number"
                    step="0.5"
                    defaultValue={report?.actualHours ?? 0}
                  />
                </div>
              </div>
              {report && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="completionPercent">نسبة الإنجاز (0-100)</Label>
                    <Input
                      id="completionPercent"
                      name="completionPercent"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={report?.completionPercent ?? 100}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qualityScore">تقييم الجودة (1-10)</Label>
                    <Input
                      id="qualityScore"
                      name="qualityScore"
                      type="number"
                      min={1}
                      max={10}
                      defaultValue={report?.qualityScore ?? 8}
                    />
                  </div>
                </div>
              )}
              {!report && (
                <>
                  <input type="hidden" name="completionPercent" value="100" />
                  <input type="hidden" name="qualityScore" value="8" />
                </>
              )}
              <div className="grid gap-2">
                <Label htmlFor="employeeNotes">ملاحظات الموظف</Label>
                <Textarea
                  id="employeeNotes"
                  name="employeeNotes"
                  defaultValue={report?.employeeNotes ?? ""}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">إلغاء</Button>} />
              <Button type="submit" disabled={pending}>
                {pending ? "..." : report ? "حفظ التعديلات" : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}