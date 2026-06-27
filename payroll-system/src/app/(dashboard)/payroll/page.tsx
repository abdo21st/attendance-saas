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
import { CalculatorIcon, EyeIcon } from "lucide-react"
import { calculateAllPayrollsAction, calculateSinglePayrollAction } from "./actions"
import Link from "next/link"
import { PayrollFilterControls } from "@/components/payroll/filter-controls"

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

const statusOptions = [
  { value: "draft", label: "مسودة" },
  { value: "approved", label: "معتمد" },
  { value: "paid", label: "مدفوع" },
]

async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; departmentId?: string; status?: string }>
}) {
  const params = await searchParams
  const month = parseInt(params.month || String(new Date().getMonth() + 1))
  const year = parseInt(params.year || String(new Date().getFullYear()))
  const departmentId = params.departmentId || ""
  const status = params.status || ""

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } })
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)

  const where: Record<string, unknown> = { month, year }
  if (departmentId) where.employee = { departmentId }
  if (status) where.status = status

  const payrolls = await prisma.monthlyPayroll.findMany({
    where,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      payslip: { select: { basePay: true, netPay: true, grossPay: true, experienceAmount: true, salesAmount: true, conductAmount: true, commitmentDeductionAmount: true, additionalTasksTotal: true, status: true } },
    },
    orderBy: { employee: { firstName: "asc" } },
  })

  const summary = payrolls.reduce(
    (acc, p) => {
      if (p.payslip) {
        acc.totalGross += Number(p.payslip.grossPay)
        acc.totalNet += Number(p.payslip.netPay)
      }
      return acc
    },
    { totalGross: 0, totalNet: 0 }
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">إدارة المرتبات</h1>
        <div className="flex items-center gap-2">
          <form action={calculateAllPayrollsAction}>
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="year" value={year} />
            <Button type="submit">
              <CalculatorIcon /> حساب الكل
            </Button>
          </form>
          <Link href="/payroll/entry">
            <Button variant="outline">إدخال بيانات</Button>
          </Link>
        </div>
      </div>

      <PayrollFilterControls
        months={months}
        years={years}
        departments={departments}
        statusOptions={statusOptions}
        defaultValues={{
          month: String(month),
          year: String(year),
          departmentId,
          status,
        }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">إجمالي الموظفين</div>
          <div className="text-2xl font-semibold">{payrolls.length}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">إجمالي الراتب الأساسي</div>
          <div className="text-2xl font-semibold">{summary.totalGross.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">صافي الرواتب</div>
          <div className="text-2xl font-semibold">{summary.totalNet.toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الكود</TableHead>
              <TableHead>الموظف</TableHead>
              <TableHead>الأساسي</TableHead>
              <TableHead>الخبرة</TableHead>
              <TableHead>المبيعات</TableHead>
              <TableHead>السلوك</TableHead>
              <TableHead>التنقيص</TableHead>
              <TableHead>الإضافي</TableHead>
              <TableHead>الصافي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-24">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrolls.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground">
                  لا توجد بيانات مرتبات لهذا الشهر
                </TableCell>
              </TableRow>
            )}
            {payrolls.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.employee.employeeCode}</TableCell>
                <TableCell>{p.employee.firstName} {p.employee.lastName}</TableCell>
                <TableCell>{p.payslip ? Number(p.payslip.basePay).toFixed(2) : "—"}</TableCell>
                <TableCell>{p.payslip ? Number(p.payslip.experienceAmount).toFixed(2) : "—"}</TableCell>
                <TableCell>{p.payslip ? Number(p.payslip.salesAmount).toFixed(2) : "—"}</TableCell>
                <TableCell>{p.payslip ? Number(p.payslip.conductAmount).toFixed(2) : "—"}</TableCell>
                <TableCell className="text-destructive">
                  {p.payslip ? `(${Number(p.payslip.commitmentDeductionAmount).toFixed(2)})` : "—"}
                </TableCell>
                <TableCell>{p.payslip ? Number(p.payslip.additionalTasksTotal).toFixed(2) : "—"}</TableCell>
                <TableCell className="font-semibold">{p.payslip ? Number(p.payslip.netPay).toFixed(2) : "—"}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "paid" ? "default" : p.status === "approved" ? "secondary" : "outline"}>
                    {p.status === "draft" ? "مسودة" : p.status === "approved" ? "معتمد" : "مدفوع"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <form action={calculateSinglePayrollAction}>
                      <input type="hidden" name="employeeId" value={p.employeeId} />
                      <input type="hidden" name="month" value={month} />
                      <input type="hidden" name="year" value={year} />
                      <Button variant="ghost" size="icon-sm" type="submit" title="حساب">
                        <CalculatorIcon className="size-4" />
                      </Button>
                    </form>
                    <Link href={`/payroll/${p.employeeId}/${month}/${year}`}>
                      <Button variant="ghost" size="icon-sm" title="عرض كشف الراتب">
                        <EyeIcon className="size-4" />
                      </Button>
                    </Link>
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

export default PayrollPage