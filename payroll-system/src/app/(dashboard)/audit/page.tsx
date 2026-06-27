export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requirePermissionOrRedirect } from "@/lib/permissions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchIcon, FilterIcon } from "lucide-react"

const actionLabels: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  login: "تسجيل دخول",
  calculate: "حساب",
  approve: "اعتماد",
  backup: "نسخ احتياطي",
  restore: "استعادة",
}

const entityLabels: Record<string, string> = {
  User: "مستخدم",
  Employee: "موظف",
  Department: "قسم",
  Product: "صنف",
  MonthlyPayroll: "مرتب",
  Payslip: "كشف راتب",
  AttendanceRecord: "سجل حضور",
  AttendanceDevice: "جهاز حضور",
  Setting: "إعدادات",
  Backup: "نسخة احتياطية",
  Notification: "إشعار",
  TaskReport: "تقرير مهمة",
  MonthlyTaskSummary: "ملخص مهام",
  Promotion: "ترقية",
  ImportBatch: "دفعة استيراد",
  AdditionalTask: "مهمة إضافية",
}

async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; entityType?: string; action?: string }>
}) {
  const session = await auth()
  const user = session?.user as { id: string; role: string } | undefined
  await requirePermissionOrRedirect(user, "audit_view")

  const params = await searchParams
  const q = params.q || ""
  const entityType = params.entityType || ""
  const action = params.action || ""

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { user: { fullName: { contains: q, mode: "insensitive" } } },
      { user: { username: { contains: q, mode: "insensitive" } } },
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
    ]
  }
  if (entityType) where.entityType = entityType
  if (action) where.action = action

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { fullName: true, username: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const actions = ["create", "update", "delete", "login", "calculate", "approve", "backup"]
  const entityTypes = [
    "User", "Employee", "Department", "Product", "MonthlyPayroll", "Payslip",
    "AttendanceRecord", "AttendanceDevice", "Setting", "Backup", "TaskReport",
    "MonthlyTaskSummary", "Promotion", "ImportBatch", "AdditionalTask",
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">سجل التدقيق</h1>
        <p className="text-sm text-muted-foreground">تتبع جميع الإجراءات التي تمت في النظام</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تصفية البحث</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q">بحث</Label>
              <div className="relative">
                <SearchIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="q" name="q" placeholder="مستخدم، إجراء..." defaultValue={q} className="pr-9 w-60" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="action">الإجراء</Label>
              <select
                id="action"
                name="action"
                defaultValue={action}
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm w-36"
              >
                <option value="">الكل</option>
                {actions.map((a) => (
                  <option key={a} value={a}>{actionLabels[a] || a}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entityType">الكيان</Label>
              <select
                id="entityType"
                name="entityType"
                defaultValue={entityType}
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm w-44"
              >
                <option value="">الكل</option>
                {entityTypes.map((e) => (
                  <option key={e} value={e}>{entityLabels[e] || e}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 h-9"
            >
              <FilterIcon className="size-4" /> تصفية
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المستخدم</TableHead>
              <TableHead>الإجراء</TableHead>
              <TableHead>نوع الكيان</TableHead>
              <TableHead>معرف الكيان</TableHead>
              <TableHead>التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  لا توجد سجلات تدقيق
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="font-medium">{log.user.fullName}</div>
                  <div className="text-xs text-muted-foreground">{log.user.username}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{actionLabels[log.action] || log.action}</Badge>
                </TableCell>
                <TableCell>{entityLabels[log.entityType] || log.entityType}</TableCell>
                <TableCell className="font-mono text-xs">{log.entityId ? log.entityId.slice(0, 8) + "…" : "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.createdAt.toLocaleString("ar-SA")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default AuditPage
