import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
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
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } } } },
      orderBy: { employee: { employeeCode: "asc" } },
    });

    const wb = XLSX.utils.book_new();
    const data = records.map((r) => ({
      "كود الموظف": r.employee.employeeCode,
      "الاسم": `${r.employee.firstName} ${r.employee.lastName}`,
      "القسم": r.employee.department?.name || "",
      "التاريخ": r.date.toISOString().split("T")[0],
      "الحضور": r.checkIn ? r.checkIn.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "",
      "الانصراف": r.checkOut ? r.checkOut.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "",
      "الحالة": r.status === "present" ? "حاضر" : r.status === "absent" ? "غائب" : r.status === "late" ? "متأخر" : r.status,
      "دقائق تأخير": r.lateMinutes,
      "وردية ليلية": r.nightShift ? "نعم" : "لا",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "الحضور");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="attendance-${dateStr}.xlsx"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "فشل تصدير الملف" }, { status: 500 });
  }
}
