'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const purchasePrice = formData.get("purchasePrice") as string;
  const salePrice = formData.get("salePrice") as string;
  const currentStock = formData.get("currentStock") as string;
  const reorderLevel = formData.get("reorderLevel") as string;

  await prisma.product.create({
    data: {
      code,
      name,
      purchasePrice: parseFloat(purchasePrice) || 0,
      salePrice: parseFloat(salePrice) || 0,
      currentStock: parseInt(currentStock) || 0,
      reorderLevel: parseInt(reorderLevel) || 0,
    },
  });

  revalidatePath("/products");
}

export async function updateProduct(formData: FormData) {
  const id = formData.get("id") as string;
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const purchasePrice = formData.get("purchasePrice") as string;
  const salePrice = formData.get("salePrice") as string;
  const currentStock = formData.get("currentStock") as string;
  const reorderLevel = formData.get("reorderLevel") as string;

  await prisma.product.update({
    where: { id },
    data: {
      code,
      name,
      purchasePrice: parseFloat(purchasePrice) || 0,
      salePrice: parseFloat(salePrice) || 0,
      currentStock: parseInt(currentStock) || 0,
      reorderLevel: parseInt(reorderLevel) || 0,
    },
  });

  revalidatePath("/products");
}

export async function deleteProduct(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.product.delete({ where: { id } });
  revalidatePath("/products");
}
