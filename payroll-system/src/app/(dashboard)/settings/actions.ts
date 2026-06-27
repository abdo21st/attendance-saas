'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  revalidatePath("/settings");
}

export async function updateSettings(settings: { key: string; value: string }[]) {
  await prisma.$transaction(
    settings.map((s) =>
      prisma.setting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value },
      })
    )
  );

  revalidatePath("/settings");
}
