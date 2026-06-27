import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseZKTecoCSV, parseHikvisionCSV, parseExcel, autoDetectFormat, type ParsedRecord } from "@/lib/attendance-parser";
import { calculateShiftHours } from "@/lib/shift-calculator";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const deviceType = (formData.get("deviceType") as string) || "auto";
    const deviceId = formData.get("deviceId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    let records: ParsedRecord[];

    if (isExcel) {
      records = parseExcel(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    } else {
      const content = buffer.toString("utf-8");
      const format = deviceType === "auto" ? autoDetectFormat(content) : deviceType;
      records = format === "zkteco" ? parseZKTecoCSV(content) : parseHikvisionCSV(content);
    }

    let importedCount = 0;
    let failedCount = 0;
    const errors: { row: number; error: string }[] = [];

    const importBatch = await prisma.importBatch.create({
      data: {
        importType: "file",
        fileName: file.name,
        deviceType,
        totalRecords: records.length,
        importedRecords: 0,
        failedRecords: 0,
        status: "processing",
        importedById: session.user.id,
      },
    });

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      try {
        const employee = await prisma.employee.findFirst({
          where: { employeeCode: rec.employeeCode, isActive: true },
        });
        if (!employee) {
          failedCount++;
          errors.push({ row: i + 1, error: `الموظف ${rec.employeeCode} غير موجود` });
          continue;
        }

        const [day, month, year] = rec.date.split("/");
        const recordDate = new Date(`${year}-${month}-${day}`);

        const checkInTime = rec.checkIn
          ? new Date(`${year}-${month}-${day}T${rec.checkIn}`)
          : null;
        const checkOutTime = rec.checkOut
          ? (() => {
              const [h, m, s] = rec.checkOut.split(":").map(Number);
              let d = new Date(recordDate);
              d.setHours(h, m, s || 0);
              if (checkInTime && d <= checkInTime) {
                d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
              }
              return d;
            })()
          : null;

        const shiftHours = checkInTime && checkOutTime
          ? calculateShiftHours(checkInTime, checkOutTime)
          : null;

        let lateMinutes = 0;
        if (checkInTime) {
          const defaultStart = new Date(recordDate);
          defaultStart.setHours(6, 0, 0, 0);
          if (checkInTime > defaultStart) {
            lateMinutes = Math.floor((checkInTime.getTime() - defaultStart.getTime()) / 60000);
          }
        }

        await prisma.attendanceRecord.create({
          data: {
            employeeId: employee.id,
            deviceId,
            date: recordDate,
            checkIn: checkInTime,
            checkOut: checkOutTime,
            status: checkInTime ? "present" : "absent",
            lateMinutes,
            importBatchId: importBatch.id,
            nightShift: shiftHours ? shiftHours.night > 0 : false,
          },
        });
        importedCount++;
      } catch (err) {
        failedCount++;
        errors.push({ row: i + 1, error: err instanceof Error ? err.message : "خطأ غير معروف" });
      }
    }

    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: failedCount === records.length ? "failed" : "completed",
        importedRecords: importedCount,
        failedRecords: failedCount,
        errorLog: errors,
      },
    });

    return NextResponse.json({
      batchId: importBatch.id,
      total: records.length,
      imported: importedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Attendance import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "فشلت عملية الاستيراد" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [batches, total] = await Promise.all([
      prisma.importBatch.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          importedBy: { select: { fullName: true } },
          _count: { select: { records: true } },
        },
      }),
      prisma.importBatch.count(),
    ]);

    return NextResponse.json({ batches, total, page, limit });
  } catch (err) {
    return NextResponse.json(
      { error: "فشل جلب سجل الاستيرادات" },
      { status: 500 }
    );
  }
}
