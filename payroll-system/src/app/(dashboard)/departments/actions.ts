'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createDepartment(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  await prisma.department.create({
    data: { name, description: description || null },
  });

  revalidatePath("/departments");
}

export async function updateDepartment(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  await prisma.department.update({
    where: { id },
    data: { name, description: description || null },
  });

  revalidatePath("/departments");
}

export async function deleteDepartment(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.department.delete({ where: { id } });
  revalidatePath("/departments");
}
