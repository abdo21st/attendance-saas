import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import type { ReportFilter } from "./report-definitions";

const FIELD_META: Record<string, Record<string, { key: string; type: string; label: string }>> = {
  employees: {
    employeeCode: { key: "employeeCode", type: "text", label: "كود الموظف" },
    firstName: { key: "firstName", type: "text", label: "الاسم الأول" },
    lastName: { key: "lastName", type: "text", label: "الاسم الأخير" },
    fullName: { key: "fullName", type: "text", label: "الاسم الكامل" },
    departmentName: { key: "departmentName", type: "text", label: "القسم" },
    position: { key: "position", type: "text", label: "المنصب" },
    baseHourlyRate: { key: "baseHourlyRate", type: "currency", label: "قيمة الساعة" },
    startDate: { key: "startDate", type: "date", label: "تاريخ البداية" },
    averageHoursMonth: { key: "averageHoursMonth", type: "number", label: "متوسط ساعات الشهر" },
    salesTarget: { key: "salesTarget", type: "currency", label: "هدف المبيعات" },
  },
  payroll: {
    employeeName: { key: "employeeName", type: "text", label: "اسم الموظف" },
    month: { key: "month", type: "number", label: "الشهر" },
    year: { key: "year", type: "number", label: "السنة" },
    actualHours: { key: "actualHours", type: "number", label: "ساعات العمل" },
    basePay: { key: "basePay", type: "currency", label: "الراتب الأساسي" },
    experienceAmount: { key: "experienceAmount", type: "currency", label: "علاوة الخبرة" },
    salesAmount: { key: "salesAmount", type: "currency", label: "علاوة المبيعات" },
    conductAmount: { key: "conductAmount", type: "currency", label: "علاوة السلوك" },
    commitmentDeductionAmount: { key: "commitmentDeductionAmount", type: "currency", label: "خصم الالتزام" },
    overtimeAmount: { key: "overtimeAmount", type: "currency", label: "الساعات الإضافية" },
    additionalTasksTotal: { key: "additionalTasksTotal", type: "currency", label: "المهام الإضافية" },
    grossPay: { key: "grossPay", type: "currency", label: "إجمالي الراتب" },
    netPay: { key: "netPay", type: "currency", label: "صافي الراتب" },
    commitmentScore: { key: "commitmentScore", type: "number", label: "تقييم الالتزام" },
    conductScore: { key: "conductScore", type: "number", label: "تقييم السلوك" },
    status: { key: "status", type: "text", label: "الحالة" },
  },
  attendance: {
    employeeName: { key: "employeeName", type: "text", label: "اسم الموظف" },
    date: { key: "date", type: "date", label: "التاريخ" },
    checkIn: { key: "checkIn", type: "text", label: "وقت الدخول" },
    checkOut: { key: "checkOut", type: "text", label: "وقت الخروج" },
    status: { key: "status", type: "text", label: "الحالة" },
    lateMinutes: { key: "lateMinutes", type: "number", label: "دقائق التأخير" },
    deviceName: { key: "deviceName", type: "text", label: "اسم الجهاز" },
    nightShift: { key: "nightShift", type: "text", label: "وردية ليلية" },
  },
  tasks: {
    employeeName: { key: "employeeName", type: "text", label: "اسم الموظف" },
    taskName: { key: "taskName", type: "text", label: "اسم المهمة" },
    taskCategory: { key: "taskCategory", type: "text", label: "التصنيف" },
    plannedHours: { key: "plannedHours", type: "number", label: "الساعات المخططة" },
    actualHours: { key: "actualHours", type: "number", label: "الساعات الفعلية" },
    completionPercent: { key: "completionPercent", type: "percentage", label: "نسبة الإنجاز" },
    qualityScore: { key: "qualityScore", type: "number", label: "تقييم الجودة" },
    status: { key: "status", type: "text", label: "حالة التقرير" },
  },
  products: {
    code: { key: "code", type: "text", label: "كود الصنف" },
    name: { key: "name", type: "text", label: "اسم الصنف" },
    category: { key: "category", type: "text", label: "التصنيف" },
    purchasePrice: { key: "purchasePrice", type: "currency", label: "سعر الشراء" },
    salePrice: { key: "salePrice", type: "currency", label: "سعر البيع" },
    currentStock: { key: "currentStock", type: "number", label: "المخزون الحالي" },
    reorderLevel: { key: "reorderLevel", type: "number", label: "الحد الأدنى" },
  },
};

function buildPrismaWhere(filters: ReportFilter[]): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  for (const f of filters || []) {
    const fieldKey = f.field
      .replace("employeeName", "employeeId")
      .replace("departmentName", "departmentId");
    switch (f.operator) {
      case "equals":
        where[fieldKey] = f.value;
        break;
      case "not_equals":
        where[fieldKey] = { not: f.value };
        break;
      case "contains":
        where[fieldKey] = { contains: f.value, mode: "insensitive" };
        break;
      case "greater_than":
        where[fieldKey] = { gt: f.value };
        break;
      case "less_than":
        where[fieldKey] = { lt: f.value };
        break;
      case "between":
        where[fieldKey] = { gte: f.value, lte: f.value2 };
        break;
      case "in":
        where[fieldKey] = { in: Array.isArray(f.value) ? f.value : [f.value] };
        break;
    }
  }
  return where;
}

function buildPrismaOrderBy(
  sortBy: { field: string; direction: "asc" | "desc" }[]
): Record<string, "asc" | "desc">[] {
  return (sortBy || []).map((s) => ({
    [s.field.replace("employeeName", "employeeId")]: s.direction || "asc",
  }));
}

function extractFieldValue(record: any, fieldKey: string, dataSource: string): any {
  if (dataSource === "employees") {
    if (fieldKey === "fullName")
      return `${record.firstName || ""} ${record.lastName || ""}`.trim();
    if (fieldKey === "departmentName") return record.department?.name || "";
    return record[fieldKey] ?? null;
  }
  if (dataSource === "payroll") {
    if (fieldKey === "employeeName")
      return `${record.employee?.firstName || ""} ${record.employee?.lastName || ""}`.trim();
    if (
      [
        "basePay",
        "experienceAmount",
        "salesAmount",
        "conductAmount",
        "commitmentDeductionAmount",
        "overtimeAmount",
        "additionalTasksTotal",
        "grossPay",
        "netPay",
        "commitmentScore",
        "conductScore",
      ].includes(fieldKey)
    ) {
      return record.payslip ? Number(record.payslip[fieldKey]) : null;
    }
    if (fieldKey === "actualHours") return Number(record[fieldKey]);
    return record[fieldKey] ?? null;
  }
  if (dataSource === "attendance") {
    if (fieldKey === "employeeName")
      return `${record.employee?.firstName || ""} ${record.employee?.lastName || ""}`.trim();
    if (fieldKey === "checkIn")
      return record.checkIn
        ? record.checkIn.toLocaleTimeString("ar-EG")
        : "";
    if (fieldKey === "checkOut")
      return record.checkOut
        ? record.checkOut.toLocaleTimeString("ar-EG")
        : "";
    if (fieldKey === "date")
      return record.date ? record.date.toISOString().split("T")[0] : "";
    if (fieldKey === "nightShift") return record.nightShift ? "نعم" : "لا";
    return record[fieldKey] ?? null;
  }
  if (dataSource === "tasks") {
    if (fieldKey === "employeeName")
      return `${record.employee?.firstName || ""} ${record.employee?.lastName || ""}`.trim();
    return record[fieldKey] ?? null;
  }
  return record[fieldKey] ?? null;
}

export async function executeReport(
  template: {
    dataSource: string;
    fields: string[];
    filters?: ReportFilter[];
    sortBy?: { field: string; direction: "asc" | "desc" }[];
    groupBy?: string;
  },
  additionalFilters?: ReportFilter[]
): Promise<{ columns: string[]; rows: any[][] }> {
  const { dataSource, fields, filters, sortBy } = template;

  const allFilters: ReportFilter[] = [
    ...(filters || []),
    ...(additionalFilters || []),
  ];
  const where = buildPrismaWhere(allFilters);
  const orderBy = buildPrismaOrderBy(sortBy || []);

  let records: any[] = [];

  switch (dataSource) {
    case "employees": {
      records = await prisma.employee.findMany({
        where: where as any,
        include: { department: true },
        orderBy: orderBy.length > 0 ? orderBy : ({ createdAt: "desc" } as any),
      });
      break;
    }
    case "payroll": {
      records = await prisma.monthlyPayroll.findMany({
        where: where as any,
        include: {
          employee: { select: { firstName: true, lastName: true } },
          payslip: true,
        },
        orderBy: orderBy.length > 0 ? orderBy : ({ createdAt: "desc" } as any),
      });
      break;
    }
    case "attendance": {
      records = await prisma.attendanceRecord.findMany({
        where: where as any,
        include: {
          employee: { select: { firstName: true, lastName: true } },
        },
        orderBy: orderBy.length > 0
          ? orderBy
          : ([{ date: "desc" }] as any),
      });
      break;
    }
    case "tasks": {
      records = await prisma.taskReport.findMany({
        where: where as any,
        include: {
          employee: { select: { firstName: true, lastName: true } },
        },
        orderBy: orderBy.length > 0
          ? orderBy
          : ([{ createdAt: "desc" }] as any),
      });
      break;
    }
    case "products": {
      records = await prisma.product.findMany({
        where: where as any,
        orderBy: orderBy.length > 0
          ? orderBy
          : ([{ createdAt: "desc" }] as any),
      });
      break;
    }
    default:
      throw new Error(`مصدر البيانات "${dataSource}" غير صالح`);
  }

  const meta = FIELD_META[dataSource] || {};
  const columns = fields.map((k) => meta[k]?.label || k);
  const rows = records.map((r) =>
    fields.map((k) => extractFieldValue(r, k, dataSource))
  );

  return { columns, rows };
}

export function exportToExcel(
  data: { columns: string[]; rows: any[][] },
  filename: string
): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([data.columns, ...data.rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function exportToPDF(
  data: { columns: string[]; rows: any[][] },
  title: string
): Promise<Buffer> {
  const ReactPDF = await import("@react-pdf/renderer");
  const React = await import("react");

  const styles = ReactPDF.StyleSheet.create({
    page: {
      direction: "rtl",
      padding: 30,
      fontFamily: "Helvetica",
    },
    title: {
      fontSize: 18,
      textAlign: "center",
      marginBottom: 20,
      fontWeight: "bold",
    },
    table: {
      width: "100%",
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: "#ccc",
    } as any,
    tableRow: {
      flexDirection: "row",
    },
    tableHeaderCell: {
      backgroundColor: "#f0f0f0",
      padding: 5,
      borderWidth: 1,
      borderColor: "#ccc",
      fontSize: 9,
      fontWeight: "bold",
      textAlign: "center",
      flex: 1,
    },
    tableCell: {
      padding: 4,
      borderWidth: 1,
      borderColor: "#ccc",
      fontSize: 8,
      textAlign: "center",
      flex: 1,
    },
  });

  const MyDocument = () =>
    React.createElement(
      ReactPDF.Document,
      null,
      React.createElement(
        ReactPDF.Page,
        { size: "A4", orientation: "landscape" as any, style: styles.page },
        React.createElement(ReactPDF.Text, { style: styles.title }, title),
        React.createElement(
          ReactPDF.View,
          { style: styles.table },
          React.createElement(
            ReactPDF.View,
            { style: styles.tableRow, fixed: true },
            ...data.columns.map((col) =>
              React.createElement(
                ReactPDF.View,
                { key: col, style: styles.tableHeaderCell },
                col
              )
            )
          ),
          ...data.rows.slice(0, 500).map((row, i) =>
            React.createElement(
              ReactPDF.View,
              { key: i, style: styles.tableRow },
              ...row.map((cell: any, j: number) =>
                React.createElement(
                  ReactPDF.View,
                  { key: j, style: styles.tableCell },
                  String(cell ?? "")
                )
              )
            )
          )
        )
      )
    );

  const stream = await ReactPDF.renderToStream(
    React.createElement(MyDocument)
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array);
  }
  return Buffer.concat(chunks);
}
