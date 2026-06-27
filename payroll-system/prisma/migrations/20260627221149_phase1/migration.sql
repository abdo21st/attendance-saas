-- AlterTable
ALTER TABLE "task_reports" ADD COLUMN     "isException" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "qualityScore" SET DEFAULT 8;

-- CreateTable
CREATE TABLE "monthly_sales" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalSales" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "employeeSales" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "salesRatio" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_sales_employeeId_month_year_key" ON "monthly_sales"("employeeId", "month", "year");

-- AddForeignKey
ALTER TABLE "monthly_sales" ADD CONSTRAINT "monthly_sales_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
