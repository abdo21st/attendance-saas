export const dynamic = "force-dynamic"

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requirePermissionOrRedirect } from "@/lib/permissions"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DatabaseIcon, UploadIcon, DownloadIcon, RotateCcwIcon } from "lucide-react"
import { createBackup, listBackups } from "@/lib/backup"
import { revalidatePath } from "next/cache"

async function createBackupAction() {
  "use server"
  await createBackup()
  revalidatePath("/backup")
}

async function BackupPage() {
  const session = await auth()
  const user = session?.user as { id: string; role: string } | undefined
  await requirePermissionOrRedirect(user, "backup_create")

  const backups = await listBackups()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">النسخ الاحتياطي</h1>
        <p className="text-sm text-muted-foreground">إدارة النسخ الاحتياطية لقاعدة البيانات</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">إنشاء نسخة احتياطية</CardTitle>
            <CardDescription>تصدير كامل لقاعدة البيانات إلى ملف SQL</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createBackupAction}>
              <Button type="submit" className="w-full">
                <DatabaseIcon /> إنشاء نسخة احتياطية
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">استعادة نسخة</CardTitle>
            <CardDescription>استيراد قاعدة البيانات من ملف نسخة احتياطية</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              <RotateCcwIcon /> استعادة نسخة
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">تحميل نسخة</CardTitle>
            <CardDescription>تنزيل ملف النسخة الاحتياطية للجهاز</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              <DownloadIcon /> تحميل
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخر النسخ الاحتياطية</CardTitle>
          <CardDescription>آخر 10 نسخ احتياطية تم إنشاؤها</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الحجم</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    لا توجد نسخ احتياطية بعد
                  </TableCell>
                </TableRow>
              )}
              {backups.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.createdAt.toLocaleString("ar-SA")}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{b.backupType === "manual" ? "يدوي" : "تلقائي"}</Badge>
                  </TableCell>
                  <TableCell>{(b.fileSize / 1024).toFixed(1)} KB</TableCell>
                  <TableCell>
                    <Badge variant={b.status === "completed" ? "default" : "destructive"}>
                      {b.status === "completed" ? "مكتمل" : "فشل"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">شرح العملية</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• النسخة الاحتياطية تصدر قاعدة البيانات بالكامل إلى ملف SQL.</p>
          <p>• يمكن استخدام ملف النسخة لاستعادة البيانات في أي وقت.</p>
          <p>• يفضل إنشاء نسخة احتياطية قبل إجراء أي تغييرات كبيرة.</p>
          <p>• النسخ الاحتياطية تحفظ في مجلد backups/ داخل المشروع.</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default BackupPage
