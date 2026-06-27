'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createEmployee(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const departmentId = formData.get("departmentId") as string;
  const position = formData.get("position") as string;
  const baseHourlyRate = formData.get("baseHourlyRate") as string;
  const startDate = formData.get("startDate") as string;
  const averageHoursMonth = formData.get("averageHoursMonth") as string;
  const averageHoursDay = formData.get("averageHoursDay") as string;
  const salesTarget = formData.get("salesTarget") as string;

  if (!departmentId) {
    throw new Error("يجب اختيار القسم");
  }

  const count = await prisma.employee.count();
  const employeeCode = `EMP${String(count + 1).padStart(4, "0")}`;

  await prisma.employee.create({
    data: {
      employeeCode,
      firstName,
      lastName,
      departmentId,
      position,
      baseHourlyRate: parseFloat(baseHourlyRate) || 0,
      startDate: new Date(startDate),
      averageHoursMonth: parseFloat(averageHoursMonth) || 0,
      averageHoursDay: parseFloat(averageHoursDay) || 0,
      salesTarget: parseFloat(salesTarget) || 0,
    },
  });

  revalidatePath("/employees");
}

export async function updateEmployee(formData: FormData) {
  const id = formData.get("id") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const departmentId = formData.get("departmentId") as string;
  const position = formData.get("position") as string;
  const baseHourlyRate = formData.get("baseHourlyRate") as string;
  const startDate = formData.get("startDate") as string;
  const averageHoursMonth = formData.get("averageHoursMonth") as string;
  const averageHoursDay = formData.get("averageHoursDay") as string;
  const salesTarget = formData.get("salesTarget") as string;

  if (!departmentId) {
    throw new Error("يجب اختيار القسم");
  }

  await prisma.employee.update({
    where: { id },
    data: {
      firstName,
      lastName,
      departmentId,
      position,
      baseHourlyRate: parseFloat(baseHourlyRate) || 0,
      startDate: new Date(startDate),
      averageHoursMonth: parseFloat(averageHoursMonth) || 0,
      averageHoursDay: parseFloat(averageHoursDay) || 0,
      salesTarget: parseFloat(salesTarget) || 0,
    },
  });

  revalidatePath("/employees");
}

export async function deleteEmployee(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.employee.delete({ where: { id } });
  revalidatePath("/employees");
}

export async function searchEmployees(query: string) {
  if (!query.trim()) {
    return prisma.employee.findMany({
      include: { department: true },
      orderBy: { createdAt: "desc" },
    });
  }

  return prisma.employee.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { employeeCode: { contains: query, mode: "insensitive" } },
        { position: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { department: true },
    orderBy: { createdAt: "desc" },
  });
}
