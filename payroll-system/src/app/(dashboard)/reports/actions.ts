"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  executeReport,
  exportToExcel,
  exportToPDF,
} from "@/lib/report-builder";

export async function saveReportTemplate(data: {
  id?: string;
  name: string;
  description?: string;
  dataSource: string;
  fields: string[];
  filters?: any[];
  sortBy?: any[];
  groupBy?: string;
  showTotals?: boolean;
  chartType?: string;
  isShared?: boolean;
}): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("غير مصرح");

  const userId = (session.user as any).id;

  if (data.id) {
    await prisma.reportTemplate.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        dataSource: data.dataSource,
        fields: JSON.parse(JSON.stringify(data.fields)),
        filters: data.filters ? JSON.parse(JSON.stringify(data.filters)) : null,
        sortBy: data.sortBy ? JSON.parse(JSON.stringify(data.sortBy)) : null,
        groupBy: data.groupBy || null,
        showTotals: data.showTotals ?? false,
        chartType: data.chartType || null,
        isShared: data.isShared ?? false,
      },
    });
    revalidatePath("/reports");
    return data.id;
  }

  const template = await prisma.reportTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      dataSource: data.dataSource,
      fields: JSON.parse(JSON.stringify(data.fields)),
      filters: data.filters ? JSON.parse(JSON.stringify(data.filters)) : null,
      sortBy: data.sortBy ? JSON.parse(JSON.stringify(data.sortBy)) : null,
      groupBy: data.groupBy || null,
      showTotals: data.showTotals ?? false,
      chartType: data.chartType || null,
      createdById: userId,
      isShared: data.isShared ?? false,
    },
  });

  revalidatePath("/reports");
  return template.id;
}

export async function updateReportTemplate(id: string, data: any): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("غير مصرح");

  await prisma.reportTemplate.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      dataSource: data.dataSource,
      fields: JSON.parse(JSON.stringify(data.fields)),
      filters: data.filters ? JSON.parse(JSON.stringify(data.filters)) : null,
      sortBy: data.sortBy ? JSON.parse(JSON.stringify(data.sortBy)) : null,
      groupBy: data.groupBy || null,
      showTotals: data.showTotals ?? false,
      chartType: data.chartType || null,
      isShared: data.isShared ?? false,
    },
  });

  revalidatePath("/reports");
}

export async function deleteReportTemplate(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("غير مصرح");

  const id = formData.get("id") as string;
  await prisma.reportTemplate.delete({ where: { id } });
  revalidatePath("/reports");
}

export async function getReportTemplates(): Promise<any[]> {
  const session = await auth();
  if (!session?.user) throw new Error("غير مصرح");

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const templates = await prisma.reportTemplate.findMany({
    where: userRole === "admin" ? undefined : {
      OR: [{ createdById: userId }, { isShared: true }],
    },
    include: {
      createdBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return templates.map((t) => ({
    ...t,
    fields: t.fields as string[],
    filters: t.filters as any[] | null,
    sortBy: t.sortBy as any[] | null,
  }));
}

export async function getReportTemplateById(id: string): Promise<any | null> {
  const session = await auth();
  if (!session?.user) return null;

  const template = await prisma.reportTemplate.findUnique({
    where: { id },
    include: {
      createdBy: { select: { fullName: true } },
    },
  });

  if (!template) return null;

  return {
    ...template,
    fields: template.fields as string[],
    filters: template.filters as any[] | null,
    sortBy: template.sortBy as any[] | null,
  };
}

export async function executeReportAction(
  template: any,
  additionalFilters?: any[]
): Promise<{ columns: string[]; rows: any[][] }> {
  const session = await auth();
  if (!session?.user) throw new Error("غير مصرح");
  return executeReport(template, additionalFilters);
}

export async function exportExcelAction(
  data: { columns: string[]; rows: any[][] },
  filename: string
): Promise<{ buffer: number[]; mime: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("غير مصرح");
  const buf = exportToExcel(data, filename);
  return { buffer: Array.from(buf), mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
}

export async function exportPDFAction(
  data: { columns: string[]; rows: any[][] },
  title: string
): Promise<{ buffer: number[]; mime: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("غير مصرح");
  const buf = await exportToPDF(data, title);
  return { buffer: Array.from(buf), mime: "application/pdf" };
}
