"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function createTaskReport(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("غير مصرح");

  const user = session.user as { id: string; role: string };

  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
  });

  if (!employee && user.role === "employee") throw new Error("لا يوجد موظف مرتبط");

  const employeeId =
    formData.get("employeeId")?.toString() ||
    employee?.id ||
    "";
  const taskName = formData.get("taskName") as string;
  const taskDescription = formData.get("taskDescription") as string;
  const taskCategory = formData.get("taskCategory") as string;
  const plannedHours = formData.get("plannedHours") as string;
  const actualHours = formData.get("actualHours") as string;
  const completionPercent = formData.get("completionPercent") as string;
  const qualityScore = formData.get("qualityScore") as string;
  const employeeNotes = formData.get("employeeNotes") as string;
  const reportMonth = formData.get("reportMonth") as string;
  const reportYear = formData.get("reportYear") as string;

  await prisma.taskReport.create({
    data: {
      employeeId,
      taskName,
      taskDescription: taskDescription || null,
      taskCategory: taskCategory || null,
      plannedHours: parseFloat(plannedHours) || 0,
      actualHours: parseFloat(actualHours) || 0,
      completionPercent: parseInt(completionPercent) || 100,
      qualityScore: parseInt(qualityScore) || 8,
      employeeNotes: employeeNotes || null,
      reportMonth: parseInt(reportMonth) || new Date().getMonth() + 1,
      reportYear: parseInt(reportYear) || new Date().getFullYear(),
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/tasks/summary");
}

export async function updateTaskReport(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("غير مصرح");

  const id = formData.get("id") as string;
  const taskName = formData.get("taskName") as string;
  const taskDescription = formData.get("taskDescription") as string;
  const taskCategory = formData.get("taskCategory") as string;
  const plannedHours = formData.get("plannedHours") as string;
  const actualHours = formData.get("actualHours") as string;
  const completionPercent = formData.get("completionPercent") as string;
  const qualityScore = formData.get("qualityScore") as string;
  const employeeNotes = formData.get("employeeNotes") as string;

  await prisma.taskReport.update({
    where: { id },
    data: {
      taskName,
      taskDescription: taskDescription || null,
      taskCategory: taskCategory || null,
      plannedHours: parseFloat(plannedHours) || 0,
      actualHours: parseFloat(actualHours) || 0,
      completionPercent: parseInt(completionPercent) || 100,
      qualityScore: parseInt(qualityScore) || 8,
      employeeNotes: employeeNotes || null,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/tasks/summary");
}

export async function submitTaskReport(formData: FormData) {
  const id = formData.get("id") as string;

  await prisma.taskReport.update({
    where: { id },
    data: {
      status: "submitted",
      qualityScore: 8,
      completionPercent: 100,
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
}

export async function reviewTaskReport(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("غير مصرح");

  const user = session.user as { id: string; role: string };
  await requirePermission(user, "tasks_review");

  const id = formData.get("id") as string;
  const managerNotes = formData.get("managerNotes") as string;
  const status = formData.get("status") as string;
  const incomingQuality = formData.get("qualityScore")?.toString();
  const incomingCompletion = formData.get("completionPercent")?.toString();

  const current = await prisma.taskReport.findUnique({ where: { id } });

  const isException =
    (incomingQuality !== undefined && incomingQuality !== null && incomingQuality !== "" && Number(incomingQuality) !== current?.qualityScore) ||
    (incomingCompletion !== undefined && incomingCompletion !== null && incomingCompletion !== "" && Number(incomingCompletion) !== current?.completionPercent);

  const updateData: Record<string, unknown> = {
    managerNotes: managerNotes || null,
    status: status as string,
    reviewedById: user.id,
    reviewedAt: new Date(),
  };

  if (incomingQuality !== undefined && incomingQuality !== null && incomingQuality !== "") {
    updateData.qualityScore = parseInt(incomingQuality);
  }
  if (incomingCompletion !== undefined && incomingCompletion !== null && incomingCompletion !== "") {
    updateData.completionPercent = parseInt(incomingCompletion);
  }
  if (isException) {
    updateData.isException = true;
  }

  await prisma.taskReport.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/tasks/summary");
}

export async function deleteTaskReport(formData: FormData) {
  const id = formData.get("id") as string;

  await prisma.taskReport.delete({ where: { id } });

  revalidatePath("/tasks");
  revalidatePath("/tasks/summary");
}

export async function finalizeMonthlySummary(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("غير مصرح");

  const user = session.user as { id: string; role: string };
  await requirePermission(user, "tasks_finalize");

  const employeeId = formData.get("employeeId") as string;
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);

  const reports = await prisma.taskReport.findMany({
    where: { employeeId, reportMonth: month, reportYear: year },
  });

  const totalTasks = reports.length;
  const completedTasks = reports.filter(
    (r) => r.status === "approved" || r.status === "reviewed"
  ).length;
  const totalPlannedHours = reports.reduce((s, r) => s + Number(r.plannedHours), 0);
  const totalActualHours = reports.reduce((s, r) => s + Number(r.actualHours), 0);
  const averageCompletion =
    totalTasks > 0
      ? reports.reduce((s, r) => s + r.completionPercent, 0) / totalTasks
      : 0;
  const averageQuality =
    totalTasks > 0
      ? reports.reduce((s, r) => s + r.qualityScore, 0) / totalTasks
      : 0;
  let performanceFactor = 1.0;
  if (averageQuality >= 9) performanceFactor = 1.15;
  else if (averageQuality >= 7) performanceFactor = 1.00;
  else performanceFactor = 0.85;

  const performanceScore = averageQuality;

  await prisma.monthlyTaskSummary.upsert({
    where: { employeeId_month_year: { employeeId, month, year } },
    update: {
      totalTasks,
      completedTasks,
      totalPlannedHours,
      totalActualHours,
      averageCompletion,
      averageQuality,
      performanceScore,
      performanceFactor,
      status: "finalized",
      finalizedById: user.id,
      finalizedAt: new Date(),
    },
    create: {
      employeeId,
      month,
      year,
      totalTasks,
      completedTasks,
      totalPlannedHours,
      totalActualHours,
      averageCompletion,
      averageQuality,
      performanceScore,
      performanceFactor,
      status: "finalized",
      finalizedById: user.id,
      finalizedAt: new Date(),
    },
  });

  revalidatePath("/tasks/summary");
}

export async function getMonthlySummary(employeeId: string, month: number, year: number) {
  return prisma.monthlyTaskSummary.findUnique({
    where: { employeeId_month_year: { employeeId, month, year } },
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
  });
}
