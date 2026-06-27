export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusIcon, PlayIcon, PencilIcon, TrashIcon, FileText } from "lucide-react";
import Link from "next/link";
import { deleteReportTemplate } from "./actions";
import { DATA_SOURCES } from "@/lib/report-definitions";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";

const dataSourceLabels: Record<string, string> = {};
for (const [key, val] of Object.entries(DATA_SOURCES)) {
  dataSourceLabels[key] = val.label;
}

const chartTypeLabels: Record<string, string> = {
  bar: "أعمدة",
  line: "خطي",
  pie: "دائري",
};

async function ReportsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const userId = (session.user as any).id;
  const user = session.user as { id: string; role: string } | undefined;

  const canViewAll = await can(user, "reports_view");
  const templates = await prisma.reportTemplate.findMany({
    where: canViewAll ? undefined : {
      OR: [{ createdById: userId }, { isShared: true }],
    },
    include: {
      createdBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">التقارير</h1>
          <p className="text-sm text-muted-foreground">
            تصميم وتشغيل التقارير المخصصة
          </p>
        </div>
        <Link href="/reports/designer">
          <Button>
            <PlusIcon /> تصميم تقرير جديد
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الوصف</TableHead>
              <TableHead>مصدر البيانات</TableHead>
              <TableHead>الرسم البياني</TableHead>
              <TableHead>المشاركة</TableHead>
              <TableHead>المنشئ</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="w-28">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  لا توجد تقارير مخصصة بعد
                </TableCell>
              </TableRow>
            )}
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    {t.name}
                  </div>
                </TableCell>
                <TableCell className="max-w-40 truncate text-muted-foreground">
                  {t.description || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {dataSourceLabels[t.dataSource] || t.dataSource}
                  </Badge>
                </TableCell>
                <TableCell>
                  {t.chartType ? (
                    <Badge variant="outline">
                      {chartTypeLabels[t.chartType] || t.chartType}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={t.isShared ? "default" : "ghost"}>
                    {t.isShared ? "مشارك" : "خاص"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t.createdBy.fullName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t.createdAt.toLocaleDateString("ar-EG")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link href={`/reports/${t.id}`}>
                      <Button variant="ghost" size="icon-sm" title="تشغيل التقرير">
                        <PlayIcon className="size-4" />
                      </Button>
                    </Link>
                    <Link href={`/reports/designer?id=${t.id}`}>
                      <Button variant="ghost" size="icon-sm" title="تعديل">
                        <PencilIcon className="size-4" />
                      </Button>
                    </Link>
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" className="text-destructive" title="حذف">
                            <TrashIcon className="size-4" />
                          </Button>
                        }
                      />
                      <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                          <DialogTitle>تأكيد الحذف</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                          هل أنت متأكد من حذف التقرير &quot;{t.name}&quot;؟
                        </p>
                        <form action={deleteReportTemplate} className="flex justify-end gap-2 pt-2">
                          <input type="hidden" name="id" value={t.id} />
                          <Button type="submit" variant="destructive">حذف</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default ReportsPage;
