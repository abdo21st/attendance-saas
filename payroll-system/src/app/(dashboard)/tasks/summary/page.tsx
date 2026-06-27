export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { finalizeMonthlySummary } from "../actions"
import { PerformanceChart } from "./chart"
import { SummaryFilterControls } from "@/components/tasks/summary-filter-controls"
import Link from "next/link"

async function TaskSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const session = await auth()
  const user = session?.user as { id: string; role: string } | undefined

  const params = await searchParams
  const month = parseInt(params.month || String(new Date().getMonth() + 1))
  const year = parseInt(params.year || String(new Date().getFullYear()))
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: { department: true },
    orderBy: { firstName: "asc" },
  })

  const summaries = await prisma.monthlyTaskSummary.findMany({
    where: { month, year },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true } },
    },
  })

  const summaryMap = new Map(summaries.map((s) => [s.employeeId, s]))

  const chartData = summaries.map((s) => ({
    name: `${s.employee.firstName} ${s.employee.lastName}`,
    averageCompletion: Number(s.averageCompletion),
    averageQuality: Number(s.averageQuality) * 10,
    performanceScore: Number(s.performanceScore),
    performanceFactor: Number(s.performanceFactor),
  }))

  const canFinalize = await can(user, "tasks_finalize")
  const totalTasks = summaries.reduce((s, sm) => s + sm.totalTasks, 0)
  const totalCompleted = summaries.reduce((s, sm) => s + sm.completedTasks, 0)
  const avgCompletion =
    summaries.length > 0
      ? summaries.reduce((s, sm) => s + Number(sm.averageCompletion), 0) / summaries.length
      : 0
  const avgQuality =
    summaries.length > 0
      ? summaries.reduce((s, sm) => s + Number(sm.averageQuality), 0) / summaries.length
      : 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ملخص الأداء الشهري</h1>
        <Link href="/tasks">
          <Button variant="outline">العودة للمهام</Button>
        </Link>
      </div>

      <SummaryFilterControls month={month} year={year} years={years} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">إجمالي المهام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">المهام المنجزة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalCompleted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">متوسط الإنجاز</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" dir="ltr">{avgCompletion.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">متوسط الجودة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{avgQuality.toFixed(1)}/10</div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الرسم البياني للأداء</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceChart data={chartData} />
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الموظف</TableHead>
              <TableHead>القسم</TableHead>
              <TableHead>إجمالي المهام</TableHead>
              <TableHead>المنجزة</TableHead>
              <TableHead>متوسط الإنجاز</TableHead>
              <TableHead>متوسط الجودة</TableHead>
              <TableHead>درجة الأداء</TableHead>
              <TableHead>معامل الأداء</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-24">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  لا يوجد موظفون
                </TableCell>
              </TableRow>
            )}
            {employees.map((emp) => {
              const sm = summaryMap.get(emp.id)
              return (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">
                    {emp.firstName} {emp.lastName}
                  </TableCell>
                  <TableCell>{emp.department.name}</TableCell>
                  <TableCell>{sm?.totalTasks ?? "—"}</TableCell>
                  <TableCell>{sm?.completedTasks ?? "—"}</TableCell>
                  <TableCell dir="ltr" className="text-left">
                    {sm ? `${Number(sm.averageCompletion).toFixed(1)}%` : "—"}
                  </TableCell>
                  <TableCell>{sm ? `${Number(sm.averageQuality).toFixed(1)}/10` : "—"}</TableCell>
                  <TableCell dir="ltr" className="text-left">
                    {sm ? Number(sm.performanceScore).toFixed(1) : "—"}
                  </TableCell>
                  <TableCell>
                    {sm ? (
                      <Badge variant={Number(sm.performanceFactor) >= 1.05 ? "default" : Number(sm.performanceFactor) >= 1 ? "secondary" : "destructive"}>
                        {Number(sm.performanceFactor).toFixed(2)}
                      </Badge>
                    ) : (
                      "1.00"
                    )}
                  </TableCell>
                  <TableCell>
                    {sm ? (
                      <Badge variant={sm.status === "finalized" ? "default" : "outline"}>
                        {sm.status === "finalized" ? "معلن" : "مسودة"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">غير محسوب</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {canFinalize && (
                      <form action={finalizeMonthlySummary}>
                        <input type="hidden" name="employeeId" value={emp.id} />
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="year" value={year} />
                        <Button variant="ghost" size="sm" type="submit">
                          {sm?.status === "finalized" ? "إعادة حساب" : "احتساب"}
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default TaskSummaryPage
