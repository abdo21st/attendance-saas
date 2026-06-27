export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
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
import { PlusIcon, PencilIcon } from "lucide-react"
import { createDepartment, updateDepartment } from "./actions"
import { DeleteDepartmentButton } from "./delete-button"

async function DepartmentsPage() {
  const departments = await prisma.department.findMany({
    include: { manager: true, _count: { select: { employees: true } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">إدارة الأقسام</h1>
        <Dialog>
          <DialogTrigger render={<Button><PlusIcon /> إضافة قسم</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة قسم جديد</DialogTitle>
              <DialogDescription>إدخال بيانات القسم</DialogDescription>
            </DialogHeader>
            <form action={createDepartment}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">اسم القسم</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Input id="description" name="description" />
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
              <TableHead>اسم القسم</TableHead>
              <TableHead>الوصف</TableHead>
              <TableHead>مدير القسم</TableHead>
              <TableHead>عدد الموظفين</TableHead>
              <TableHead className="w-24">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  لا يوجد أقسام
                </TableCell>
              </TableRow>
            )}
            {departments.map((dep) => (
              <TableRow key={dep.id}>
                <TableCell className="font-medium">{dep.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {dep.description || "—"}
                </TableCell>
                <TableCell>{dep.manager?.fullName || "—"}</TableCell>
                <TableCell>{dep._count.employees}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button variant="ghost" size="icon-sm">
                            <PencilIcon className="size-4" />
                          </Button>
                        }
                      />
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>تعديل القسم</DialogTitle>
                          <DialogDescription>تعديل بيانات القسم</DialogDescription>
                        </DialogHeader>
                        <form action={updateDepartment}>
                          <input type="hidden" name="id" value={dep.id} />
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="edit-name">اسم القسم</Label>
                              <Input id="edit-name" name="name" defaultValue={dep.name} required />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="edit-desc">الوصف</Label>
                              <Input id="edit-desc" name="description" defaultValue={dep.description ?? ""} />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose render={<Button variant="outline">إلغاء</Button>} />
                            <Button type="submit">حفظ</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <DeleteDepartmentButton id={dep.id} />
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

export default DepartmentsPage
