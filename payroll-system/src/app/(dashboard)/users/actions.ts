'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function createUser(formData: FormData) {
  const session = await auth();
  await requirePermission(session?.user as any, "users_create");
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as string;
  const departmentId = formData.get("departmentId") as string;
  const isActive = formData.get("isActive") === "on";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      fullName,
      role: role as "admin" | "manager" | "employee",
      departmentId: departmentId || null,
      isActive,
    },
  });

  revalidatePath("/users");
}

export async function toggleUserStatus(formData: FormData) {
  const session = await auth();
  await requirePermission(session?.user as any, "users_edit");

  const userId = formData.get("userId") as string;
  const isActive = formData.get("isActive") === "true";

  await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  revalidatePath("/users");
}

export async function resetPassword(formData: FormData) {
  const session = await auth();
  await requirePermission(session?.user as any, "users_reset_password");

  const userId = formData.get("userId") as string;
  const newPassword = formData.get("newPassword") as string;

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  revalidatePath("/users");
}
