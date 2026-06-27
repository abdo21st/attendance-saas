import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const devices = await prisma.attendanceDevice.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { records: true } } },
    });
    return NextResponse.json({ devices });
  } catch {
    return NextResponse.json({ error: "فشل جلب الأجهزة" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const body = await request.json();
    const device = await prisma.attendanceDevice.create({
      data: {
        name: body.name,
        deviceType: body.deviceType,
        ipAddress: body.ipAddress || null,
        port: body.port ? parseInt(body.port) : null,
        model: body.model || null,
      },
    });
    return NextResponse.json({ device });
  } catch {
    return NextResponse.json({ error: "فشل إضافة الجهاز" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "معرف الجهاز مطلوب" }, { status: 400 });
    const body = await request.json();
    const device = await prisma.attendanceDevice.update({
      where: { id },
      data: {
        name: body.name,
        deviceType: body.deviceType,
        ipAddress: body.ipAddress || null,
        port: body.port ? parseInt(body.port) : null,
        model: body.model || null,
      },
    });
    return NextResponse.json({ device });
  } catch {
    return NextResponse.json({ error: "فشل تحديث الجهاز" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "معرف الجهاز مطلوب" }, { status: 400 });
    await prisma.attendanceDevice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل حذف الجهاز" }, { status: 500 });
  }
}
