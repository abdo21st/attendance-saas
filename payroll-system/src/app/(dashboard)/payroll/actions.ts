"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { calculatePayroll } from "@/lib/payroll-calculator";

export async function savePayrollEntry(formData: FormData) {
  const employeeId = formData.get("employeeId") as string;
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  const actualHours = parseFloat(formData.get("actualHours") as string) || 0;
  const overtimeHours = parseFloat(formData.get("overtimeHours") as string) || 0;
  const commitmentScore = parseInt(formData.get("commitmentScore") as string) || 5;
  const conductScore = parseInt(formData.get("conductScore") as string) || 5;
  const salesTargetReached = formData.get("salesTargetReached") === "on";
  const notes = formData.get("notes") as string;

  const payroll = await prisma.monthlyPayroll.upsert({
    where: { employeeId_month_year: { employeeId, month, year } },
    update: { actualHours, overtimeHours, commitmentScore, conductScore, salesTargetReached, notes },
    create: { employeeId, month, year, actualHours, overtimeHours, commitmentScore, conductScore, salesTargetReached, notes },
  });

  const taskNames = formData.getAll("taskName") as string[];
  const taskDescriptions = formData.getAll("taskDescription") as string[];
  const taskHours = formData.getAll("taskHours") as string[];
  const taskAmounts = formData.getAll("taskAmount") as string[];

  await prisma.additionalTask.deleteMany({ where: { payrollId: payroll.id } });

  for (let i = 0; i < taskNames.length; i++) {
    if (!taskNames[i]?.trim()) continue;
    await prisma.additionalTask.create({
      data: {
        payrollId: payroll.id,
        taskName: taskNames[i],
        description: taskDescriptions[i] || null,
        hours: parseFloat(taskHours[i]) || 0,
        amount: parseFloat(taskAmounts[i]) || 0,
      },
    });
  }

  revalidatePath("/payroll");
  revalidatePath("/payroll/entry");
}

export async function calculateSinglePayrollAction(formData: FormData) {
  const employeeId = formData.get("employeeId") as string;
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  await calculateSinglePayroll(employeeId, month, year);
}

async function calculateSinglePayroll(employeeId: string, month: number, year: number) {
  const payrollRecord = await prisma.monthlyPayroll.findUnique({
    where: { employeeId_month_year: { employeeId, month, year } },
  });

  if (!payrollRecord) throw new Error("لم يتم إدخال بيانات هذا الموظف لهذا الشهر");

  const monthlySales = await prisma.monthlySales.findUnique({
    where: { employeeId_month_year: { employeeId, month, year } },
  });

  const result = await calculatePayroll({
    employeeId,
    month,
    year,
    actualHours: Number(payrollRecord.actualHours),
    overtimeHours: Number(payrollRecord.overtimeHours),
    commitmentScore: payrollRecord.commitmentScore,
    conductScore: payrollRecord.conductScore,
    salesTargetReached: payrollRecord.salesTargetReached,
    salesRatio: monthlySales ? Number(monthlySales.salesRatio) : undefined,
  });

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error("الموظف غير موجود");

  await prisma.payslip.upsert({
    where: { employeeId_month_year: { employeeId, month, year } },
    update: {
      payrollId: payrollRecord.id,
      actualHours: payrollRecord.actualHours,
      baseHourlyRate: employee.baseHourlyRate,
      basePay: result.basePay,
      experienceFactor: result.experienceFactor,
      experienceAmount: result.experienceAmount,
      salesFactor: result.salesFactor,
      salesAmount: result.salesAmount,
      conductFactor: result.conductFactor,
      conductAmount: result.conductAmount,
      taskPerformanceFactor: result.taskPerformanceFactor,
      taskPerformanceAmount: result.taskPerformanceAmount,
      commitmentScore: payrollRecord.commitmentScore,
      commitmentDeductionRate: result.commitmentDeductionRate,
      commitmentDeductionAmount: result.commitmentDeductionAmount,
      overtimeHours: payrollRecord.overtimeHours,
      overtimeAmount: result.overtimeAmount,
      additionalTasksTotal: result.additionalTasksTotal,
      grossPay: result.grossPay,
      taxAmount: result.taxAmount,
      socialInsuranceAmount: result.socialInsuranceAmount,
      otherDeductions: result.otherDeductions,
      totalDeductions: result.totalDeductions,
      netPay: result.netPay,
    },
    create: {
      employeeId,
      payrollId: payrollRecord.id,
      month,
      year,
      actualHours: payrollRecord.actualHours,
      baseHourlyRate: employee.baseHourlyRate,
      basePay: result.basePay,
      experienceFactor: result.experienceFactor,
      experienceAmount: result.experienceAmount,
      salesFactor: result.salesFactor,
      salesAmount: result.salesAmount,
      conductFactor: result.conductFactor,
      conductAmount: result.conductAmount,
      taskPerformanceFactor: result.taskPerformanceFactor,
      taskPerformanceAmount: result.taskPerformanceAmount,
      commitmentScore: payrollRecord.commitmentScore,
      commitmentDeductionRate: result.commitmentDeductionRate,
      commitmentDeductionAmount: result.commitmentDeductionAmount,
      overtimeHours: payrollRecord.overtimeHours,
      overtimeAmount: result.overtimeAmount,
      additionalTasksTotal: result.additionalTasksTotal,
      grossPay: result.grossPay,
      taxAmount: result.taxAmount,
      socialInsuranceAmount: result.socialInsuranceAmount,
      otherDeductions: result.otherDeductions,
      totalDeductions: result.totalDeductions,
      netPay: result.netPay,
    },
  });

  revalidatePath("/payroll");
  revalidatePath(`/payroll/${employeeId}/${month}/${year}`);

  return result;
}

export async function calculateAllPayrollsAction(formData: FormData) {
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  await calculateAllPayrolls(month, year);
}

async function calculateAllPayrolls(month: number, year: number) {
  const employees = await prisma.employee.findMany({ where: { isActive: true } });
  const results: { employeeId: string; fullName: string; netPay: number }[] = [];

  for (const employee of employees) {
    let payrollRecord = await prisma.monthlyPayroll.findUnique({
      where: { employeeId_month_year: { employeeId: employee.id, month, year } },
    });

    if (!payrollRecord) {
      payrollRecord = await prisma.monthlyPayroll.create({
        data: {
          employeeId: employee.id,
          month,
          year,
          actualHours: Number(employee.averageHoursMonth),
          overtimeHours: 0,
          commitmentScore: 5,
          conductScore: 5,
          salesTargetReached: false,
        },
      });
    }

    try {
      await calculateSinglePayroll(employee.id, month, year);
      results.push({
        employeeId: employee.id,
        fullName: `${employee.firstName} ${employee.lastName}`,
        netPay: 0,
      });
    } catch {
      results.push({
        employeeId: employee.id,
        fullName: `${employee.firstName} ${employee.lastName}`,
        netPay: 0,
      });
    }
  }

  revalidatePath("/payroll");
  return results;
}

export async function approvePayrollAction(formData: FormData) {
  const payrollId = formData.get("payrollId") as string;
  await approvePayroll(payrollId);
}

async function approvePayroll(payrollId: string) {
  await prisma.monthlyPayroll.update({
    where: { id: payrollId },
    data: { status: "approved" },
  });

  const payroll = await prisma.monthlyPayroll.findUnique({ where: { id: payrollId } });
  if (payroll) {
    await prisma.payslip.updateMany({
      where: { employeeId: payroll.employeeId, month: payroll.month, year: payroll.year },
      data: { status: "approved" },
    });
  }

  revalidatePath("/payroll");
}

export async function getPayrollSummary(month: number, year: number) {
  const payslips = await prisma.payslip.findMany({
    where: { month, year },
    include: {
      employee: { select: { firstName: true, lastName: true, departmentId: true } },
    },
  });

  const totalGross = payslips.reduce((s, p) => s + Number(p.grossPay), 0);
  const totalNet = payslips.reduce((s, p) => s + Number(p.netPay), 0);
  const totalTax = payslips.reduce((s, p) => s + Number(p.taxAmount), 0);
  const totalDeductions = payslips.reduce((s, p) => s + Number(p.totalDeductions), 0);

  return {
    totalEmployees: payslips.length,
    totalGross: Math.round(totalGross * 100) / 100,
    totalNet: Math.round(totalNet * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    payslips,
  };
}
