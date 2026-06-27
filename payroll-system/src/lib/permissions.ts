import { prisma } from "./prisma"
import { auth } from "./auth"
import { redirect } from "next/navigation"

export const PERMISSIONS = {
  // Employees
  employees_view: { name: "عرض الموظفين", category: "employees", description: "مشاهدة قائمة الموظفين" },
  employees_create: { name: "إضافة موظف", category: "employees", description: "إضافة موظف جديد" },
  employees_edit: { name: "تعديل موظف", category: "employees", description: "تعديل بيانات الموظف" },
  employees_delete: { name: "حذف موظف", category: "employees", description: "حذف موظف" },
  employees_export: { name: "تصدير الموظفين", category: "employees", description: "تصدير قائمة الموظفين إلى Excel" },

  // Departments
  departments_view: { name: "عرض الأقسام", category: "departments", description: "مشاهدة قائمة الأقسام" },
  departments_create: { name: "إضافة قسم", category: "departments", description: "إضافة قسم جديد" },
  departments_edit: { name: "تعديل قسم", category: "departments", description: "تعديل بيانات القسم" },
  departments_delete: { name: "حذف قسم", category: "departments", description: "حذف قسم" },

  // Products
  products_view: { name: "عرض المنتجات", category: "products", description: "مشاهدة قائمة المنتجات" },
  products_create: { name: "إضافة منتج", category: "products", description: "إضافة منتج جديد" },
  products_edit: { name: "تعديل منتج", category: "products", description: "تعديل بيانات المنتج" },
  products_delete: { name: "حذف منتج", category: "products", description: "حذف منتج" },

  // Attendance
  attendance_view: { name: "عرض الحضور", category: "attendance", description: "مشاهدة سجل الحضور" },
  attendance_import: { name: "استيراد الحضور", category: "attendance", description: "استيراد سجلات الحضور من ملف" },
  attendance_devices: { name: "إدارة الأجهزة", category: "attendance", description: "إدارة أجهزة الحضور" },
  attendance_reports: { name: "تقارير الحضور", category: "attendance", description: "عرض تقارير الحضور" },
  attendance_export: { name: "تصدير الحضور", category: "attendance", description: "تصدير سجلات الحضور" },

  // Tasks
  tasks_view: { name: "عرض المهام", category: "tasks", description: "مشاهدة قائمة المهام" },
  tasks_create: { name: "إضافة مهمة", category: "tasks", description: "إضافة تقرير مهمة" },
  tasks_edit: { name: "تعديل مهمة", category: "tasks", description: "تعديل تقرير مهمة" },
  tasks_delete: { name: "حذف مهمة", category: "tasks", description: "حذف تقرير مهمة" },
  tasks_review: { name: "مراجعة المهام", category: "tasks", description: "مراجعة واعتماد تقارير المهام" },
  tasks_summary: { name: "ملخص المهام", category: "tasks", description: "عرض ملخص الأداء الشهري" },
  tasks_finalize: { name: "اعتماد الملخص", category: "tasks", description: "اعتماد ملخص الأداء الشهري" },

  // Payroll
  payroll_view: { name: "عرض الرواتب", category: "payroll", description: "مشاهدة قائمة الرواتب" },
  payroll_create: { name: "إضافة راتب", category: "payroll", description: "إضافة راتب لموظف" },
  payroll_calculate: { name: "حساب الرواتب", category: "payroll", description: "حساب الرواتب تلقائياً" },
  payroll_edit: { name: "تعديل راتب", category: "payroll", description: "تعديل إدخال راتب" },
  payroll_approve: { name: "اعتماد الرواتب", category: "payroll", description: "اعتماد صرف الرواتب" },
  payroll_delete: { name: "حذف راتب", category: "payroll", description: "حذف راتب" },

  // Payslips
  payslip_view: { name: "عرض كشف الراتب", category: "payslip", description: "مشاهدة كشف الراتب" },
  payslip_export: { name: "تصدير كشف الراتب", category: "payslip", description: "تصدير كشف الراتب PDF/Excel" },

  // Reports
  reports_view: { name: "عرض التقارير", category: "reports", description: "مشاهدة قائمة التقارير" },
  reports_create: { name: "إنشاء تقرير", category: "reports", description: "إنشاء تقرير جديد" },
  reports_edit: { name: "تعديل تقرير", category: "reports", description: "تعديل تقرير" },
  reports_delete: { name: "حذف تقرير", category: "reports", description: "حذف تقرير" },

  // Settings
  settings_view: { name: "عرض الإعدادات", category: "settings", description: "مشاهدة الإعدادات" },
  settings_edit: { name: "تعديل الإعدادات", category: "settings", description: "تعديل الإعدادات" },

  // Permissions (self)
  permissions_view: { name: "عرض الصلاحيات", category: "permissions", description: "مشاهدة صلاحيات الأدوار" },
  permissions_edit: { name: "تعديل الصلاحيات", category: "permissions", description: "تعديل صلاحيات الأدوار" },

  // Users
  users_view: { name: "عرض المستخدمين", category: "users", description: "مشاهدة قائمة المستخدمين" },
  users_create: { name: "إضافة مستخدم", category: "users", description: "إضافة مستخدم جديد" },
  users_edit: { name: "تعديل مستخدم", category: "users", description: "تعديل بيانات المستخدم" },
  users_delete: { name: "حذف مستخدم", category: "users", description: "حذف مستخدم" },
  users_reset_password: { name: "إعادة تعيين كلمة المرور", category: "users", description: "إعادة تعيين كلمة مرور مستخدم" },

  // Audit & Backup
  audit_view: { name: "عرض السجل", category: "audit", description: "مشاهدة سجل التدقيق" },
  backup_create: { name: "إنشاء نسخة احتياطية", category: "backup", description: "إنشاء نسخة احتياطية" },
  backup_restore: { name: "استعادة نسخة احتياطية", category: "backup", description: "استعادة نسخة احتياطية" },

  // Notifications
  notifications_view: { name: "عرض الإشعارات", category: "notifications", description: "مشاهدة الإشعارات" },

  // Sales
  sales_view: { name: "عرض المبيعات", category: "sales", description: "مشاهدة المبيعات الشهرية" },
  sales_edit: { name: "إدخال المبيعات", category: "sales", description: "إدخال وتعديل المبيعات الشهرية" },
} as const

export type PermissionKey = keyof typeof PERMISSIONS

const ROLE_DEFAULTS: Record<string, PermissionKey[]> = {
  admin: Object.keys(PERMISSIONS) as PermissionKey[],
  manager: [
    "employees_view", "employees_create", "employees_edit", "employees_export",
    "departments_view",
    "products_view",
    "attendance_view", "attendance_import", "attendance_devices", "attendance_reports", "attendance_export",
    "tasks_view", "tasks_create", "tasks_edit", "tasks_review", "tasks_summary", "tasks_finalize",
    "sales_view", "sales_edit",
    "payroll_view", "payroll_create", "payroll_calculate", "payroll_edit", "payroll_approve",
    "payslip_view", "payslip_export",
    "reports_view", "reports_create", "reports_edit",
    "settings_view", "settings_edit",
    "permissions_view",
    "notifications_view",
  ],
  employee: [
    "tasks_view", "tasks_create",
    "tasks_summary",
    "payslip_view",
    "attendance_view",
    "notifications_view",
  ],
}

type SessionUser = { id: string; role: string } | undefined

export async function getUserPermissions(user?: SessionUser): Promise<PermissionKey[]> {
  if (!user) return []
  if (user.role === "admin") return Object.keys(PERMISSIONS) as PermissionKey[]

  const perms = await prisma.rolePermission.findMany({
    where: { role: user.role as any },
    select: { permission: { select: { key: true } } },
  })
  return perms.map((rp) => rp.permission.key as PermissionKey)
}

export async function can(user: SessionUser, permission: PermissionKey): Promise<boolean> {
  if (!user) return false
  if (user.role === "admin") return true
  const count = await prisma.rolePermission.count({
    where: { role: user.role as any, permission: { key: permission } },
  })
  return count > 0
}

export async function requirePermission(user: SessionUser, permission: PermissionKey): Promise<void> {
  const hasPermission = await can(user, permission)
  if (!hasPermission) {
    throw new Error("ليس لديك صلاحية للقيام بهذا الإجراء")
  }
}

export async function requirePermissionOrRedirect(user: SessionUser, permission: PermissionKey): Promise<void> {
  const hasPermission = await can(user, permission)
  if (!hasPermission) redirect("/")
}

export function getDefaultPermissionsForRole(role: string): PermissionKey[] {
  return ROLE_DEFAULTS[role] ?? []
}
