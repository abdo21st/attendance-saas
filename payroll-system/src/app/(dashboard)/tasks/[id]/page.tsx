export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { auth } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { submitTaskReport, reviewTaskReport } from "../actions"

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

async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as { id: string; role: string } | undefined
  const { id } = await params

  const report = await prisma.taskReport.findUnique({
    where: { id },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      reviewedBy: { select: { fullName: true } },
    },
  })

  if (!report) notFound()

  const canReviewTasks = await can(user, "tasks_review")

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">تفاصيل تقرير المهمة</h1>
        <Badge variant={statusBadge[report.status] || "outline"}>
          {statusLabel[report.status] || report.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات المهمة</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">الموظف</Label>
            <div className="font-medium">{report.employee.firstName} {report.employee.lastName}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">كود الموظف</Label>
            <div className="font-mono text-sm">{report.employee.employeeCode}</div>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-muted-foreground">اسم المهمة</Label>
            <div className="font-medium">{report.taskName}</div>
          </div>
          {report.taskDescription && (
            <div className="sm:col-span-2">
              <Label className="text-muted-foreground">وصف المهمة</Label>
              <div className="whitespace-pre-wrap text-sm">{report.taskDescription}</div>
            </div>
          )}
          {report.taskCategory && (
            <div>
              <Label className="text-muted-foreground">التصنيف</Label>
              <div>{report.taskCategory}</div>
            </div>
          )}
          <div>
            <Label className="text-muted-foreground">الشهر</Label>
            <div>{report.reportMonth}/{report.reportYear}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">الساعات المخططة</Label>
            <div>{Number(report.plannedHours).toFixed(1)}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">الساعات الفعلية</Label>
            <div>{Number(report.actualHours).toFixed(1)}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">نسبة الإنجاز</Label>
            <div dir="ltr" className="text-left">{report.completionPercent}%</div>
          </div>
          <div>
            <Label className="text-muted-foreground">تقييم الجودة</Label>
            <div>{report.qualityScore}/10</div>
          </div>
        </CardContent>
      </Card>

      {report.employeeNotes && (
        <Card>
          <CardHeader>
            <CardTitle>ملاحظات الموظف</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm">{report.employeeNotes}</div>
          </CardContent>
        </Card>
      )}

      {report.managerNotes && (
        <Card>
          <CardHeader>
            <CardTitle>ملاحظات المدير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm">{report.managerNotes}</div>
            {report.reviewedBy && (
              <div className="mt-2 text-xs text-muted-foreground">
                بواسطة: {report.reviewedBy.fullName}
                {report.reviewedAt && ` - ${new Date(report.reviewedAt).toLocaleDateString("ar-EG")}`}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {report.status === "draft" && (
        <form action={submitTaskReport}>
          <input type="hidden" name="id" value={report.id} />
          <Button type="submit">إرسال للمراجعة</Button>
        </form>
      )}

      {canReviewTasks && (report.status === "submitted" || report.status === "reviewed") && (
        <Card>
          <CardHeader>
            <CardTitle>مراجعة المدير</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={reviewTaskReport} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={report.id} />
              <div className="grid gap-2">
                <Label htmlFor="managerNotes">ملاحظات المراجعة</Label>
                <Textarea
                  id="managerNotes"
                  name="managerNotes"
                  placeholder="أدخل ملاحظاتك..."
                  rows={4}
                  defaultValue={report.managerNotes ?? ""}
                />
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button type="submit" name="status" value="approved">
                  اعتماد التقرير
                </Button>
                <Button type="submit" name="status" value="rejected" variant="destructive">
                  رفض التقرير
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {report.status === "approved" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
          تم اعتماد هذا التقرير
        </div>
      )}
      {report.status === "rejected" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          تم رفض هذا التقرير
        </div>
      )}
    </div>
  )
}

export default TaskDetailPage
