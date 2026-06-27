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

    const totalEmployees = await prisma.employee.count({ where: { isActive: true } });

    const todayRecords = await prisma.attendanceRecord.findMany({
      where: { date: { gte: startOfDay, lte: endOfDay } },
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
    });

    const presentToday = todayRecords.filter((r) => r.status === "present").length;
    const absentToday = todayRecords.filter((r) => r.status === "absent").length;
    const lateToday = todayRecords.filter((r) => r.status === "late" || r.lateMinutes > 0).length;

    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const nightShiftsThisMonth = await prisma.attendanceRecord.count({
      where: { nightShift: true, date: { gte: firstOfMonth, lte: endOfDay } },
    });

    const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    return NextResponse.json({
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      attendanceRate,
      nightShiftsThisMonth,
    });
  } catch {
    return NextResponse.json({ error: "فشل جلب الإحصائيات" }, { status: 500 });
  }
}
