"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
import { createEmployee, updateEmployee } from "@/app/(dashboard)/employees/actions"

type Department = { id: string; name: string }

export function EmployeeForm({
  departments,
  employee,
}: {
  departments: Department[]
  employee?: {
    id: string
    firstName: string
    lastName: string
    departmentId: string
    position: string
    baseHourlyRate: number
    startDate: string
    averageHoursMonth: number
    averageHoursDay: number
    salesTarget: number
  }
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const action = employee ? updateEmployee : createEmployee

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const form = e.currentTarget
    startTransition(async () => {
      try {
        await action(new FormData(form))
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ")
      }
    })
  }

  return (
    <>
      {!employee && (
        <Button onClick={() => setOpen(true)}>
          <span className="ml-1">+</span> إضافة موظف
        </Button>
      )}
      {employee && (
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {employee ? "تعديل موظف" : "إضافة موظف جديد"}
            </DialogTitle>
            <DialogDescription>
              {employee
                ? "تعديل بيانات الموظف"
                : "إدخال بيانات الموظف الجديد"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            {employee && (
              <input type="hidden" name="id" value={employee.id} />
            )}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">الاسم الأول</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    defaultValue={employee?.firstName}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">الاسم الأخير</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    defaultValue={employee?.lastName}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="departmentId">القسم</Label>
                <Select
                  name="departmentId"
                  defaultValue={employee?.departmentId || undefined}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>
                        {dep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="position">المنصب</Label>
                <Input
                  id="position"
                  name="position"
                  defaultValue={employee?.position}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="baseHourlyRate">قيمة الساعة</Label>
                  <Input
                    id="baseHourlyRate"
                    name="baseHourlyRate"
                    type="number"
                    step="0.01"
                    defaultValue={employee?.baseHourlyRate}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="startDate">تاريخ البدء</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={
                      employee?.startDate
                        ? new Date(employee.startDate).toISOString().split("T")[0]
                        : undefined
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="averageHoursMonth">متوسط ساعات الشهر</Label>
                  <Input
                    id="averageHoursMonth"
                    name="averageHoursMonth"
                    type="number"
                    step="0.01"
                    defaultValue={employee?.averageHoursMonth}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="averageHoursDay">متوسط ساعات اليوم</Label>
                  <Input
                    id="averageHoursDay"
                    name="averageHoursDay"
                    type="number"
                    step="0.01"
                    defaultValue={employee?.averageHoursDay}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="salesTarget">هدف المبيعات</Label>
                <Input
                  id="salesTarget"
                  name="salesTarget"
                  type="number"
                  step="0.01"
                  defaultValue={employee?.salesTarget}
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="outline">إلغاء</Button>} />
              <Button type="submit" disabled={pending}>
                {pending ? "..." : employee ? "حفظ التعديلات" : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
