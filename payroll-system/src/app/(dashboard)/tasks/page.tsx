export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { PlusIcon, EyeIcon } from "lucide-react"
import Link from "next/link"
import { deleteTaskReport, submitTaskReport } from "./actions"
import { TaskForm } from "@/components/tasks/task-form"
import { TaskFilterControls } from "@/components/tasks/filter-controls"
import { auth } from "@/lib/auth"
import { can } from "@/lib/permissions"

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

const statusBadge: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  submitted: "secondary",
  reviewed: "default",
  approved: "default",
  rejected: "destructive",
}

const statusLabel: Record<string, string> = {
  draft: "مسودة",
  submitted: "بإنتظار المراجعة",
  reviewed: "تمت المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
}

const statusOptions = [
  { value: "draft", label: "مسودة" },
  { value: "submitted", label: "بإنتظار المراجعة" },
  { value: "reviewed", label: "تمت المراجعة" },
  { value: "approved", label: "معتمد" },
  { value: "rejected", label: "مرفوض" },
]

async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; departmentId?: string; status?: string }>
}) {
  const session = await auth()
  const user = session?.user as { id: string; role: string; departmentId?: string } | undefined

  const params = await searchParams
  const month = parseInt(params.month || String(new Date().getMonth() + 1))
  const year = parseInt(params.year || String(new Date().getFullYear()))
  const departmentId = params.departmentId || ""
  const statusFilter = params.status || ""

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } })
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)

  const employees = await prisma.employee.findMany({
    include: { department: true },
    orderBy: { firstName: "asc" },
  })

  const where: Record<string, unknown> = { reportMonth: month, reportYear: year }
  if (departmentId) where.employee = { departmentId }
  if (statusFilter) where.status = statusFilter
  const canReview = await can(user, "tasks_review")
  if (!canReview && user) {
    const emp = await prisma.employee.findUnique({ where: { userId: user.id } })
    if (emp) where.employeeId = emp.id
  }

  const reports = await prisma.taskReport.findMany({
    where,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">تقارير المهام</h1>
        <div className="flex items-center gap-2">
          <Link href="/tasks/summary">
            <Button variant="outline">ملخص الأداء</Button>
          </Link>
          {user && (
            <TaskForm
              employees={employees}
              defaultMonth={month}
              defaultYear={year}
            />
          )}
        </div>
      </div>

      <TaskFilterControls
        months={months}
        years={years}
        departments={departments}
        statusOptions={statusOptions}
        defaultValues={{
          month: String(month),
          year: String(year),
          departmentId,
          status: statusFilter,
        }}
      />

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الموظف</TableHead>
              <TableHead>المهمة</TableHead>
              <TableHead>الساعات المخططة</TableHead>
              <TableHead>الساعات الفعلية</TableHead>
              <TableHead>نسبة الإنجاز</TableHead>
              <TableHead>تقييم الجودة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-28">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  لا توجد تقارير مهام لهذا الشهر
                </TableCell>
              </TableRow>
            )}
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.employee.firstName} {r.employee.lastName}</TableCell>
                <TableCell className="font-medium">{r.taskName}</TableCell>
                <TableCell>{Number(r.plannedHours).toFixed(1)}</TableCell>
                <TableCell>{Number(r.actualHours).toFixed(1)}</TableCell>
                <TableCell dir="ltr" className="text-left">{r.completionPercent}%</TableCell>
                <TableCell>{r.qualityScore}/10</TableCell>
                <TableCell>
                  <Badge variant={statusBadge[r.status] || "outline"}>
                    {statusLabel[r.status] || r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {r.status === "draft" && (
                      <form action={submitTaskReport}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button variant="ghost" size="icon-sm" type="submit" title="إرسال للمراجعة">
                          <EyeIcon className="size-4" />
                        </Button>
                      </form>
                    )}
                    <Link href={`/tasks/${r.id}`}>
                      <Button variant="ghost" size="icon-sm" title="عرض">
                        <EyeIcon className="size-4" />
                      </Button>
                    </Link>
                    {r.status === "draft" && (
                      <TaskForm
                        employees={employees}
                        report={{
                          id: r.id,
                          employeeId: r.employeeId,
                          taskName: r.taskName,
                          taskDescription: r.taskDescription,
                          taskCategory: r.taskCategory,
                          plannedHours: Number(r.plannedHours),
                          actualHours: Number(r.actualHours),
                          completionPercent: r.completionPercent,
                          qualityScore: r.qualityScore,
                          employeeNotes: r.employeeNotes,
                          reportMonth: r.reportMonth,
                          reportYear: r.reportYear,
                        }}
                      />
                    )}
                    {r.status === "draft" && (
                      <form action={deleteTaskReport}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          onClick={(e) => {
                            if (!confirm("تأكيد حذف التقرير؟")) e.preventDefault()
                          }}
                        >
                          <EyeIcon className="size-4" />
                        </Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default TasksPage