export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PrinterIcon, FileSpreadsheetIcon, ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

const monthNames = [
  "", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
]

async function PayslipPage({
  params,
}: {
  params: Promise<{ employeeId: string; month: string; year: string }>
}) {
  const { employeeId, month: monthStr, year: yearStr } = await params
  const month = parseInt(monthStr)
  const year = parseInt(yearStr)

  const payslip = await prisma.payslip.findUnique({
    where: { employeeId_month_year: { employeeId, month, year } },
    include: {
      employee: {
        include: { department: { select: { name: true } } },
      },
      payroll: {
        include: { additionalTasks: true },
      },
    },
  })

  if (!payslip) {
    notFound()
  }

  const emp = payslip.employee

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/payroll?month=${month}&year=${year}`}>
            <Button variant="ghost" size="icon-sm">
              <ArrowLeftIcon className="size-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">كشف الراتب</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={payslip.status === "paid" ? "default" : payslip.status === "approved" ? "secondary" : "outline"}>
            {payslip.status === "draft" ? "مسودة" : payslip.status === "approved" ? "معتمد" : "مدفوع"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <PrinterIcon /> طباعة PDF
          </Button>
          <Button variant="outline" size="sm">
            <FileSpreadsheetIcon /> تصدير Excel
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 print:border-none">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold">كشف راتب شهر {monthNames[month]} {year}</h2>
          <p className="text-sm text-muted-foreground">نظام إدارة الرواتب</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">الموظف</div>
            <div className="font-medium">{emp.firstName} {emp.lastName}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">القسم</div>
            <div className="font-medium">{emp.department.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">المنصب</div>
            <div className="font-medium">{emp.position}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">قيمة الساعة</div>
            <div className="font-medium">{Number(payslip.baseHourlyRate).toFixed(2)}</div>
          </div>
        </div>

        <Separator className="my-4" />

        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">البنود الأساسية</h3>
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span>عدد الساعات الفعلية</span>
            <span className="font-mono">{Number(payslip.actualHours).toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>الراتب الأساسي (الساعات × قيمة الساعة)</span>
            <span className="font-mono">{Number(payslip.basePay).toFixed(2)}</span>
          </div>
        </div>

        <Separator className="my-4" />

        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">عوامل الزيادة</h3>
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span>عامل الخبرة (×{Number(payslip.experienceFactor).toFixed(2)})</span>
            <span className="font-mono text-green-600">{Number(payslip.experienceAmount).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>عامل المبيعات (×{Number(payslip.salesFactor).toFixed(2)})</span>
            <span className="font-mono text-green-600">{Number(payslip.salesAmount).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>عامل السلوك (×{Number(payslip.conductFactor).toFixed(2)})</span>
            <span className="font-mono text-green-600">{Number(payslip.conductAmount).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>عامل أداء المهام (×{Number(payslip.taskPerformanceFactor).toFixed(2)})</span>
            <span className="font-mono text-green-600">{Number(payslip.taskPerformanceAmount).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>الساعات الإضافية ({Number(payslip.overtimeHours).toFixed(1)} ساعة)</span>
            <span className="font-mono text-green-600">{Number(payslip.overtimeAmount).toFixed(2)}</span>
          </div>
        </div>

        <Separator className="my-4" />

        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">عوامل التنقيص</h3>
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span>تقييم الالتزام ({payslip.commitmentScore}/10) — نسبة الخصم {Math.round(Number(payslip.commitmentDeductionRate) * 100)}%</span>
            <span className="font-mono text-destructive">({Number(payslip.commitmentDeductionAmount).toFixed(2)})</span>
          </div>
        </div>

        {payslip.payroll.additionalTasks.length > 0 && (
          <>
            <Separator className="my-4" />
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">المهام الإضافية</h3>
            <div className="mb-4 space-y-2">
              {payslip.payroll.additionalTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between">
                  <span>{task.taskName}{task.hours ? ` (${Number(task.hours).toFixed(1)} ساعة)` : ""}</span>
                  <span className="font-mono">{Number(task.amount).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2 font-medium">
                <span>مجموع المهام الإضافية</span>
                <span className="font-mono">{Number(payslip.additionalTasksTotal).toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        <Separator className="my-4" />

        <div className="mb-2 space-y-2">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>إجمالي الراتب</span>
            <span className="font-mono">{Number(payslip.grossPay).toFixed(2)}</span>
          </div>
        </div>

        <Separator className="my-4" />

        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">الخصومات</h3>
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span>ضريبة الدخل</span>
            <span className="font-mono text-destructive">({Number(payslip.taxAmount).toFixed(2)})</span>
          </div>
          <div className="flex items-center justify-between">
            <span>التأمينات الاجتماعية</span>
            <span className="font-mono text-destructive">({Number(payslip.socialInsuranceAmount).toFixed(2)})</span>
          </div>
          {Number(payslip.otherDeductions) > 0 && (
            <div className="flex items-center justify-between">
              <span>خصومات أخرى</span>
              <span className="font-mono text-destructive">({Number(payslip.otherDeductions).toFixed(2)})</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-2 font-medium text-destructive">
            <span>إجمالي الخصومات</span>
            <span className="font-mono">({Number(payslip.totalDeductions).toFixed(2)})</span>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4 text-xl font-bold">
          <span>صافي الراتب</span>
          <span className="font-mono text-primary">{Number(payslip.netPay).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

export default PayslipPage
