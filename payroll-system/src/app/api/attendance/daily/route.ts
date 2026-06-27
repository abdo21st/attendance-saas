import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const { searchParams } = request.nextUrl;
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const date = new Date(dateStr);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const records = await prisma.attendanceRecord.findMany({
      where: { date: { gte: startOfDay, lte: endOfDay } },
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      orderBy: { employee: { employeeCode: "asc" } },
    });

    const formatted = records.map((r) => ({
      id: r.id,
      employeeCode: r.employee.employeeCode,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      date: r.date.toISOString().split("T")[0],
      checkIn: r.checkIn ? r.checkIn.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null,
      checkOut: r.checkOut ? r.checkOut.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null,
      status: r.status,
      lateMinutes: r.lateMinutes,
      nightShift: r.nightShift,
    }));

    return NextResponse.json({ records: formatted, total: formatted.length });
  } catch {
    return NextResponse.json({ error: "فشل جلب السجلات اليومية" }, { status: 500 });
  }
}
