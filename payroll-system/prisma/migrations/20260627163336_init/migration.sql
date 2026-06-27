-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'employee');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late', 'leave');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('draft', 'approved', 'paid');

-- CreateEnum
CREATE TYPE "TaskReportStatus" AS ENUM ('draft', 'submitted', 'reviewed', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "TaskSummaryStatus" AS ENUM ('draft', 'finalized');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('zkteco', 'hikvision');

-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('file', 'direct');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'employee',
    "departmentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "baseHourlyRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "averageHoursMonth" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "averageHoursDay" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "salesTarget" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "purchasePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "salePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "ipAddress" TEXT,
    "port" INTEGER,
    "model" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deviceId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'present',
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "verifyMode" TEXT,
    "importBatchId" TEXT,
    "nightShift" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "importType" "ImportType" NOT NULL,
    "fileName" TEXT,
    "deviceType" TEXT,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "importedRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'processing',
    "importedById" TEXT NOT NULL,
    "errorLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_payrolls" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "actualHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "lateDays" INTEGER NOT NULL DEFAULT 0,
    "commitmentScore" INTEGER NOT NULL DEFAULT 5,
    "conductScore" INTEGER NOT NULL DEFAULT 5,
    "salesTargetReached" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "PayrollStatus" NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "additional_tasks" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "description" TEXT,
    "hours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taskDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "additional_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_reports" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reportMonth" INTEGER NOT NULL,
    "reportYear" INTEGER NOT NULL,
    "taskName" TEXT NOT NULL,
    "taskDescription" TEXT,
    "taskCategory" TEXT,
    "plannedHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "actualHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "completionPercent" INTEGER NOT NULL DEFAULT 100,
    "qualityScore" INTEGER NOT NULL DEFAULT 5,
    "employeeNotes" TEXT,
    "managerNotes" TEXT,
    "status" "TaskReportStatus" NOT NULL DEFAULT 'draft',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_task_summaries" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "totalPlannedHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalActualHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "averageCompletion" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "averageQuality" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "performanceScore" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "performanceFactor" DECIMAL(65,30) NOT NULL DEFAULT 1.00,
    "status" "TaskSummaryStatus" NOT NULL DEFAULT 'draft',
    "finalizedById" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_task_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "actualHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "baseHourlyRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "basePay" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "experienceFactor" DECIMAL(65,30) NOT NULL DEFAULT 1.00,
    "experienceAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "salesFactor" DECIMAL(65,30) NOT NULL DEFAULT 1.00,
    "salesAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "conductFactor" DECIMAL(65,30) NOT NULL DEFAULT 1.00,
    "conductAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taskPerformanceFactor" DECIMAL(65,30) NOT NULL DEFAULT 1.00,
    "taskPerformanceAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "commitmentScore" INTEGER NOT NULL DEFAULT 5,
    "commitmentDeductionRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "commitmentDeductionAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "overtimeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "additionalTasksTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "socialInsuranceAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "previousPosition" TEXT,
    "newPosition" TEXT NOT NULL,
    "previousRate" DECIMAL(65,30),
    "newRate" DECIMAL(65,30) NOT NULL,
    "promotionDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "approvedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "type" TEXT NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "backupType" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_managerId_key" ON "departments"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_payrolls_employeeId_month_year_key" ON "monthly_payrolls"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_task_summaries_employeeId_month_year_key" ON "monthly_task_summaries"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payrollId_key" ON "payslips"("payrollId");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_employeeId_month_year_key" ON "payslips"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "attendance_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "additional_tasks" ADD CONSTRAINT "additional_tasks_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "monthly_payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reports" ADD CONSTRAINT "task_reports_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reports" ADD CONSTRAINT "task_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_task_summaries" ADD CONSTRAINT "monthly_task_summaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_task_summaries" ADD CONSTRAINT "monthly_task_summaries_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "monthly_payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
