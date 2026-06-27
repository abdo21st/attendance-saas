export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requirePermissionOrRedirect } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
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
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, ShieldOffIcon, ShieldCheckIcon, KeyRoundIcon } from "lucide-react"
import { createUser, toggleUserStatus, resetPassword } from "./actions"

async function UsersPage() {
  const session = await auth()
  const user = session?.user as { id: string; role: string } | undefined
  await requirePermissionOrRedirect(user, "users_view")

  const users = await prisma.user.findMany({
    include: { department: true },
    orderBy: { createdAt: "desc" },
  })

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">إدارة المستخدمين</h1>
        <Dialog>
          <DialogTrigger render={<Button><PlusIcon /> إضافة مستخدم</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة مستخدم جديد</DialogTitle>
              <DialogDescription>إدخال بيانات المستخدم</DialogDescription>
            </DialogHeader>
            <form action={createUser}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input id="username" name="username" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fullName">الاسم الكامل</Label>
                  <Input id="fullName" name="fullName" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">الدور</Label>
                  <select
                    id="role"
                    name="role"
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    required
                  >
                    <option value="employee">موظف</option>
                    <option value="manager">مدير</option>
                    <option value="admin">مدير النظام</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="departmentId">القسم</Label>
                  <select
                    id="departmentId"
                    name="departmentId"
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">بدون قسم</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" name="isActive" defaultChecked />
                  <Label htmlFor="isActive" className="mb-0">نشط</Label>
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline">إلغاء</Button>} />
                <Button type="submit">إضافة</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المستخدم</TableHead>
              <TableHead>الاسم الكامل</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>القسم</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-32">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  لا يوجد مستخدمون
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-xs">{u.username}</TableCell>
                <TableCell className="font-medium">{u.fullName}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : u.role === "manager" ? "secondary" : "outline"}>
                    {u.role === "admin" ? "مدير النظام" : u.role === "manager" ? "مدير" : "موظف"}
                  </Badge>
                </TableCell>
                <TableCell>{u.department?.name || "—"}</TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "default" : "destructive"}>
                    {u.isActive ? "نشط" : "معطل"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <form action={toggleUserStatus}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="isActive" value={u.isActive ? "false" : "true"} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={u.isActive ? "تعطيل" : "تفعيل"}
                      >
                        {u.isActive ? <ShieldOffIcon className="size-4" /> : <ShieldCheckIcon className="size-4" />}
                      </Button>
                    </form>
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" title="إعادة تعيين كلمة المرور">
                            <KeyRoundIcon className="size-4" />
                          </Button>
                        }
                      />
                      <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                          <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
                          <DialogDescription>
                            إدخال كلمة مرور جديدة للمستخدم {u.fullName}
                          </DialogDescription>
                        </DialogHeader>
                        <form action={resetPassword}>
                          <input type="hidden" name="userId" value={u.id} />
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                              <Input id="newPassword" name="newPassword" type="password" required />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose render={<Button variant="outline">إلغاء</Button>} />
                            <Button type="submit">حفظ</Button>
                          </DialogFooter>
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
  )
}

export default UsersPage
