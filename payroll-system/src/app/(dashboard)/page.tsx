import { prisma } from "@/lib/prisma"
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
import { Users, DollarSign, TrendingUp, Building2 } from "lucide-react"
import { DashboardChart } from "./dashboard-chart"

const monthNames = [
  "يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
]

export default async function DashboardPage() {
  const [employeeCount, departmentCount, payrollAgg, recentEmployees, payslips] =
    await Promise.all([
      prisma.employee.count({ where: { isActive: true } }),
      prisma.department.count(),
      prisma.payslip.aggregate({
        _sum: { netPay: true },
        _avg: { netPay: true },
      }),
      prisma.employee.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { department: true },
      }),
      prisma.payslip.groupBy({
        by: ["month", "year"],
        _sum: { netPay: true },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      }),
    ])

  const now = new Date()
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    const found = payslips.find((p) => p.month === month && p.year === year)
    return {
      month: monthNames[month - 1],
      total: found ? Number(found._sum.netPay) || 0 : 0,
    }
  })

  const totalPayroll = Number(payrollAgg._sum.netPay) || 0
  const avgPayroll = Number(payrollAgg._avg.netPay) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">لوحة التحكم</h1>
        <p className="text-sm text-muted-foreground">
          نظرة عامة على نظام إدارة الرواتب
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الموظفين</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeCount}</div>
            <p className="text-xs text-muted-foreground">موظف نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المرتبات</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPayroll.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">ريال</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">متوسط الراتب</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgPayroll.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">ريال / شهرياً</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الأقسام</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentCount}</div>
            <p className="text-xs text-muted-foreground">قسم</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مقارنة الرواتب الشهرية</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخر الموظفين المضافين</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">القسم</TableHead>
                <TableHead className="text-right">الوظيفة</TableHead>
                <TableHead className="text-right">الراتب الأساسي</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">
                    {emp.firstName} {emp.lastName}
                  </TableCell>
                  <TableCell>{emp.department.name}</TableCell>
                  <TableCell>{emp.position}</TableCell>
                  <TableCell>
                    {Number(emp.baseHourlyRate).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.isActive ? "default" : "secondary"}>
                      {emp.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recentEmployees.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-6 text-center text-muted-foreground"
                  >
                    لا يوجد موظفين بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
