import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import net from "net";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const body = await request.json();
    const device = await prisma.attendanceDevice.findUnique({ where: { id: body.id } });
    if (!device) return NextResponse.json({ error: "الجهاز غير موجود" }, { status: 404 });

    const testConnection = () => new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);
      socket.on("connect", () => { socket.destroy(); resolve(true); });
      socket.on("error", () => { socket.destroy(); resolve(false); });
      socket.on("timeout", () => { socket.destroy(); resolve(false); });
      if (device.ipAddress && device.port) {
        socket.connect(device.port, device.ipAddress);
      } else {
        resolve(false);
      }
    });

    const connected = await testConnection();
    return NextResponse.json({ connected, deviceId: device.id });
  } catch {
    return NextResponse.json({ error: "فشل اختبار الاتصال" }, { status: 500 });
  }
}
