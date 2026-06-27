import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: { department: { select: { name: true } } },
    orderBy: { firstName: "asc" },
  });
  return NextResponse.json(employees);
}
