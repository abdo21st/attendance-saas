"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { requirePermission } from "@/lib/permissions"

export async function getSalesList(month: number, year: number) {
  const session = await auth()
  if (!session?.user) throw new Error("غير مصرح")
  const user = session.user as { id: string; role: string }
  await requirePermission(user, "sales_view")

  const sales = await prisma.monthlySales.findMany({
    where: { month, year },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, employeeCode: true, salesTarget: true, departmentId: true, department: { select: { name: true } } },
      },
    },
    orderBy: { employee: { employeeCode: "asc" } },
  })

  return sales.map((s) => ({
    id: s.id,
    employeeId: s.employeeId,
    totalSales: Number(s.totalSales),
    employeeSales: Number(s.employeeSales),
    salesRatio: Number(s.salesRatio),
    employee: {
      id: s.employee.id,
      firstName: s.employee.firstName,
      lastName: s.employee.lastName,
      employeeCode: s.employee.employeeCode,
      salesTarget: Number(s.employee.salesTarget),
      department: s.employee.department,
    },
  }))
}

export async function saveMonthlySales(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("غير مصرح")
  const user = session.user as { id: string; role: string }
  await requirePermission(user, "sales_edit")

  const employeeId = formData.get("employeeId") as string
  const month = parseInt(formData.get("month") as string)
  const year = parseInt(formData.get("year") as string)
  const totalSales = parseFloat(formData.get("totalSales") as string) || 0
  const employeeSales = parseFloat(formData.get("employeeSales") as string) || 0

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
  const salesTarget = employee ? Number(employee.salesTarget) : 0
  const salesRatio = salesTarget > 0 ? employeeSales / salesTarget : 0

  await prisma.monthlySales.upsert({
    where: { employeeId_month_year: { employeeId, month, year } },
    update: { totalSales, employeeSales, salesRatio },
    create: { employeeId, month, year, totalSales, employeeSales, salesRatio },
  })

  revalidatePath("/sales")
}

export async function deleteMonthlySales(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("غير مصرح")
  const user = session.user as { id: string; role: string }
  await requirePermission(user, "sales_edit")

  const employeeId = formData.get("employeeId") as string
  const month = parseInt(formData.get("month") as string)
  const year = parseInt(formData.get("year") as string)

  await prisma.monthlySales.delete({
    where: { employeeId_month_year: { employeeId, month, year } },
  })

  revalidatePath("/sales")
}
