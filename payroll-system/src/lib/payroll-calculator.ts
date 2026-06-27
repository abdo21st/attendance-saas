import { prisma } from "@/lib/prisma";

export interface PayrollInput {
  employeeId: string;
  month: number;
  year: number;
  actualHours: number;
  overtimeHours: number;
  commitmentScore: number;
  conductScore: number;
  salesTargetReached: boolean;
  salesRatio?: number;
}

export interface PayrollResult {
  basePay: number;
  experienceFactor: number;
  experienceAmount: number;
  salesFactor: number;
  salesAmount: number;
  conductFactor: number;
  conductAmount: number;
  taskPerformanceFactor: number;
  taskPerformanceAmount: number;
  commitmentDeductionRate: number;
  commitmentDeductionAmount: number;
  overtimeAmount: number;
  additionalTasksTotal: number;
  grossPay: number;
  taxAmount: number;
  socialInsuranceAmount: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
}

export function getExperienceFactor(startDate: Date): number {
  const now = new Date();
  const ms = now.getTime() - startDate.getTime();
  const years = ms / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 1) return 1.00;
  if (years < 3) return 1.05;
  if (years < 5) return 1.10;
  if (years < 10) return 1.15;
  return 1.20;
}

export function getConductFactor(score: number): number {
  if (score >= 9) return 1.05;
  if (score >= 7) return 1.02;
  if (score >= 5) return 1.00;
  if (score >= 3) return 0.98;
  return 0.95;
}

function getCommitmentDeductionRate(score: number): number {
  if (score >= 9) return 0;
  if (score >= 7) return 0.01;
  if (score >= 5) return 0.02;
  if (score >= 3) return 0.04;
  return 0.05;
}

export async function getTaskPerformanceFactor(employeeId: string, month: number, year: number): Promise<number> {
  const summary = await prisma.monthlyTaskSummary.findUnique({
    where: { employeeId_month_year: { employeeId, month, year } },
  });
  return summary ? Number(summary.performanceFactor) : 1.00;
}

export function calculateNightShiftHours(checkIn: Date, checkOut: Date) {
  let regular = 0, evening = 0, night = 0;
  const current = new Date(checkIn);
  const end = new Date(checkOut);

  while (current < end) {
    const hour = current.getHours();
    if (hour >= 6 && hour < 18) regular++;
    else if (hour >= 18) evening++;
    else night++;
    current.setHours(current.getHours() + 1);
  }

  return { regular, evening, night };
}

export async function getSetting(key: string): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? "";
}

export async function calculatePayroll(input: PayrollInput): Promise<PayrollResult> {
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    include: {
      monthlyPayrolls: {
        where: { month: input.month, year: input.year },
        include: { additionalTasks: true },
      },
    },
  });

  if (!employee) throw new Error("الموظف غير موجود");

  const baseHourlyRate = Number(employee.baseHourlyRate);
  const basePay = baseHourlyRate * input.actualHours;

  const experienceFactor = getExperienceFactor(employee.startDate);
  const experienceAmount = basePay * (experienceFactor - 1);

  const salesTargetBonusFactor = Number(await getSetting("sales_target_bonus_factor")) || 1.10;

  let salesFactor = 1.00;
  let salesAmount = 0;

  if (input.salesRatio !== undefined && input.salesRatio > 0) {
    salesFactor = 1 + (salesTargetBonusFactor - 1) * input.salesRatio;
    salesAmount = basePay * (salesFactor - 1);
  } else if (input.salesTargetReached) {
    salesFactor = salesTargetBonusFactor;
    salesAmount = basePay * (salesFactor - 1);
  }

  const conductFactor = getConductFactor(input.conductScore);
  const conductAmount = basePay * (conductFactor - 1);

  const taskPerformanceFactor = await getTaskPerformanceFactor(input.employeeId, input.month, input.year);
  const taskPerformanceAmount = basePay * (taskPerformanceFactor - 1);

  const commitmentDeductionRate = getCommitmentDeductionRate(input.commitmentScore);
  const commitmentDeductionAmount = basePay * commitmentDeductionRate;

  const overtimeMultiplier = Number(await getSetting("overtime_multiplier")) || 1.5;
  const overtimeAmount = input.overtimeHours * baseHourlyRate * overtimeMultiplier;

  const payroll = employee.monthlyPayrolls[0];
  const additionalTasksTotal = payroll
    ? payroll.additionalTasks.reduce((sum, t) => sum + Number(t.amount), 0)
    : 0;

  const grossPay = basePay + experienceAmount + salesAmount + conductAmount
    + taskPerformanceAmount + overtimeAmount + additionalTasksTotal - commitmentDeductionAmount;

  const taxRate = Number(await getSetting("tax_rate")) || 0;
  const taxAmount = grossPay * (taxRate / 100);

  const socialInsuranceRate = Number(await getSetting("social_insurance_rate")) || 0;
  const socialInsuranceAmount = grossPay * (socialInsuranceRate / 100);

  const otherDeductions = Number(await getSetting("other_deductions")) || 0;

  const totalDeductions = taxAmount + socialInsuranceAmount + otherDeductions;
  const netPay = grossPay - totalDeductions;

  return {
    basePay: Math.round(basePay * 100) / 100,
    experienceFactor,
    experienceAmount: Math.round(experienceAmount * 100) / 100,
    salesFactor,
    salesAmount: Math.round(salesAmount * 100) / 100,
    conductFactor,
    conductAmount: Math.round(conductAmount * 100) / 100,
    taskPerformanceFactor,
    taskPerformanceAmount: Math.round(taskPerformanceAmount * 100) / 100,
    commitmentDeductionRate,
    commitmentDeductionAmount: Math.round(commitmentDeductionAmount * 100) / 100,
    overtimeAmount: Math.round(overtimeAmount * 100) / 100,
    additionalTasksTotal: Math.round(additionalTasksTotal * 100) / 100,
    grossPay: Math.round(grossPay * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    socialInsuranceAmount: Math.round(socialInsuranceAmount * 100) / 100,
    otherDeductions: Math.round(otherDeductions * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
  };
}
