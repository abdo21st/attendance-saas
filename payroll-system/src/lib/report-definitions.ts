export interface ReportField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "currency" | "percentage";
  source: string;
}

export interface ReportFilter {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in";
  value: any;
  value2?: any;
}

export const DATA_SOURCES: Record<string, { label: string; fields: ReportField[] }> = {
  employees: {
    label: "الموظفين",
    fields: [
      { key: "employeeCode", label: "كود الموظف", type: "text", source: "employee" },
      { key: "firstName", label: "الاسم الأول", type: "text", source: "employee" },
      { key: "lastName", label: "الاسم الأخير", type: "text", source: "employee" },
      { key: "fullName", label: "الاسم الكامل", type: "text", source: "employee" },
      { key: "departmentName", label: "القسم", type: "text", source: "employee" },
      { key: "position", label: "المنصب", type: "text", source: "employee" },
      { key: "baseHourlyRate", label: "قيمة الساعة", type: "currency", source: "employee" },
      { key: "startDate", label: "تاريخ البداية", type: "date", source: "employee" },
      { key: "averageHoursMonth", label: "متوسط ساعات الشهر", type: "number", source: "employee" },
      { key: "salesTarget", label: "هدف المبيعات", type: "currency", source: "employee" },
    ],
  },
  payroll: {
    label: "المرتبات",
    fields: [
      { key: "employeeName", label: "اسم الموظف", type: "text", source: "payroll" },
      { key: "month", label: "الشهر", type: "number", source: "payroll" },
      { key: "year", label: "السنة", type: "number", source: "payroll" },
      { key: "actualHours", label: "ساعات العمل", type: "number", source: "payroll" },
      { key: "basePay", label: "الراتب الأساسي", type: "currency", source: "payroll" },
      { key: "experienceAmount", label: "علاوة الخبرة", type: "currency", source: "payroll" },
      { key: "salesAmount", label: "علاوة المبيعات", type: "currency", source: "payroll" },
      { key: "conductAmount", label: "علاوة السلوك", type: "currency", source: "payroll" },
      { key: "commitmentDeductionAmount", label: "خصم الالتزام", type: "currency", source: "payroll" },
      { key: "overtimeAmount", label: "الساعات الإضافية", type: "currency", source: "payroll" },
      { key: "additionalTasksTotal", label: "المهام الإضافية", type: "currency", source: "payroll" },
      { key: "grossPay", label: "إجمالي الراتب", type: "currency", source: "payroll" },
      { key: "netPay", label: "صافي الراتب", type: "currency", source: "payroll" },
      { key: "commitmentScore", label: "تقييم الالتزام", type: "number", source: "payroll" },
      { key: "conductScore", label: "تقييم السلوك", type: "number", source: "payroll" },
      { key: "status", label: "الحالة", type: "text", source: "payroll" },
    ],
  },
  attendance: {
    label: "الحضور",
    fields: [
      { key: "employeeName", label: "اسم الموظف", type: "text", source: "attendance" },
      { key: "date", label: "التاريخ", type: "date", source: "attendance" },
      { key: "checkIn", label: "وقت الدخول", type: "text", source: "attendance" },
      { key: "checkOut", label: "وقت الخروج", type: "text", source: "attendance" },
      { key: "status", label: "الحالة", type: "text", source: "attendance" },
      { key: "lateMinutes", label: "دقائق التأخير", type: "number", source: "attendance" },
      { key: "deviceName", label: "اسم الجهاز", type: "text", source: "attendance" },
      { key: "nightShift", label: "وردية ليلية", type: "text", source: "attendance" },
    ],
  },
  tasks: {
    label: "المهام",
    fields: [
      { key: "employeeName", label: "اسم الموظف", type: "text", source: "task" },
      { key: "taskName", label: "اسم المهمة", type: "text", source: "task" },
      { key: "taskCategory", label: "التصنيف", type: "text", source: "task" },
      { key: "plannedHours", label: "الساعات المخططة", type: "number", source: "task" },
      { key: "actualHours", label: "الساعات الفعلية", type: "number", source: "task" },
      { key: "completionPercent", label: "نسبة الإنجاز", type: "percentage", source: "task" },
      { key: "qualityScore", label: "تقييم الجودة", type: "number", source: "task" },
      { key: "status", label: "حالة التقرير", type: "text", source: "task" },
    ],
  },
  products: {
    label: "الأصناف",
    fields: [
      { key: "code", label: "كود الصنف", type: "text", source: "product" },
      { key: "name", label: "اسم الصنف", type: "text", source: "product" },
      { key: "category", label: "التصنيف", type: "text", source: "product" },
      { key: "purchasePrice", label: "سعر الشراء", type: "currency", source: "product" },
      { key: "salePrice", label: "سعر البيع", type: "currency", source: "product" },
      { key: "currentStock", label: "المخزون الحالي", type: "number", source: "product" },
      { key: "reorderLevel", label: "الحد الأدنى", type: "number", source: "product" },
    ],
  },
};

export function getFieldsForSource(dataSource: string): ReportField[] {
  return DATA_SOURCES[dataSource]?.fields || [];
}

export function getDefaultFields(dataSource: string): string[] {
  return getFieldsForSource(dataSource).slice(0, 5).map((f) => f.key);
}
