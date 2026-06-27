-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dataSource" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "filters" JSONB,
    "sortBy" JSONB,
    "groupBy" TEXT,
    "showTotals" BOOLEAN NOT NULL DEFAULT false,
    "chartType" TEXT,
    "createdById" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
