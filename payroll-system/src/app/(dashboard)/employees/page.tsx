export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DownloadIcon, SearchIcon } from "lucide-react"
import { EmployeeForm } from "@/components/employees/employee-form"
import { DeleteEmployeeButton } from "./delete-button"

async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } })

  const employees = await prisma.employee.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { employeeCode: { contains: q, mode: "insensitive" } },
            { position: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { department: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">إدارة الموظفين</h1>
        <div className="flex items-center gap-2">
          <EmployeeForm departments={departments} />
          <Button variant="outline">
            <DownloadIcon /> تصدير Excel
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <form className="relative flex-1">
          <SearchIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            placeholder="بحث بالاسم أو الكود أو المنصب..."
            defaultValue={q}
            className="pr-9"
          />
        </form>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الكود</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>القسم</TableHead>
              <TableHead>المنصب</TableHead>
              <TableHead>قيمة الساعة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-24">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  لا يوجد موظفون
                </TableCell>
              </TableRow>
            )}
            {employees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
                <TableCell>{emp.firstName} {emp.lastName}</TableCell>
                <TableCell>{emp.department.name}</TableCell>
                <TableCell>{emp.position}</TableCell>
                <TableCell>{Number(emp.baseHourlyRate).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={emp.isActive ? "default" : "secondary"}>
                    {emp.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <EmployeeForm
                      departments={departments}
                      employee={{
                        id: emp.id,
                        firstName: emp.firstName,
                        lastName: emp.lastName,
                        departmentId: emp.departmentId,
                        position: emp.position,
                        baseHourlyRate: Number(emp.baseHourlyRate),
                        startDate: emp.startDate.toISOString(),
                        averageHoursMonth: Number(emp.averageHoursMonth),
                        averageHoursDay: Number(emp.averageHoursDay),
                        salesTarget: Number(emp.salesTarget),
                      }}
                    />
                    <DeleteEmployeeButton id={emp.id} />
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

export default EmployeesPage
