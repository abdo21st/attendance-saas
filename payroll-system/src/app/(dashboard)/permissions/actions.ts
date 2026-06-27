"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"

export async function getRolePermissions() {
  const roles = await prisma.rolePermission.findMany({
    include: { permission: true },
  })
  return roles
}

export async function saveRolePermissions(
  role: string,
  permissionKeys: string[]
) {
  const session = await auth()
  const user = session?.user as { role: string } | undefined
  if (!user || user.role !== "admin") {
    throw new Error("غير مصرح")
  }

  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
  })
  const permissionIds = permissions.map((p) => p.id)

  await prisma.rolePermission.deleteMany({
    where: { role: role as any },
  })

  if (permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        role: role as any,
        permissionId,
      })),
    })
  }

  revalidatePath("/permissions")
}
