import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:123@localhost:5432/payroll_system";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: hashedPassword,
      fullName: "مدير النظام",
      role: "admin",
      isActive: true,
    },
  });

  const settings = [
    { key: "company_name", value: "شركتي", category: "general", description: "اسم الشركة" },
    { key: "currency", value: "د.ل", category: "general", description: "عملة الحساب" },
    { key: "experience_0_1", value: "1.00", category: "experience", description: "معامل الخبرة أقل من سنة" },
    { key: "experience_1_3", value: "1.05", category: "experience", description: "معامل الخبرة 1-3 سنوات" },
    { key: "experience_3_5", value: "1.10", category: "experience", description: "معامل الخبرة 3-5 سنوات" },
    { key: "experience_5_10", value: "1.15", category: "experience", description: "معامل الخبرة 5-10 سنوات" },
    { key: "experience_10_plus", value: "1.20", category: "experience", description: "معامل الخبرة أكثر من 10 سنوات" },
    { key: "sales_factor_reached", value: "1.10", category: "sales", description: "معامل المبيعات عند الوصول للهدف" },
    { key: "sales_factor_not_reached", value: "1.00", category: "sales", description: "معامل المبيعات عند عدم الوصول" },
    { key: "conduct_9_10", value: "1.05", category: "conduct", description: "معامل السلوك 9-10" },
    { key: "conduct_7_8", value: "1.02", category: "conduct", description: "معامل السلوك 7-8" },
    { key: "conduct_5_6", value: "1.00", category: "conduct", description: "معامل السلوك 5-6" },
    { key: "conduct_3_4", value: "0.98", category: "conduct", description: "معامل السلوك 3-4" },
    { key: "conduct_1_2", value: "0.95", category: "conduct", description: "معامل السلوك 1-2" },
    { key: "deduction_rate", value: "0.20", category: "commitment", description: "نسبة التنقيص القصوى للالتزام" },
    { key: "overtime_factor", value: "1.50", category: "overtime", description: "معامل الساعات الإضافية" },
    { key: "task_perf_90_100", value: "1.05", category: "task_performance", description: "معامل أداء المهام 90-100%" },
    { key: "task_perf_70_89", value: "1.02", category: "task_performance", description: "معامل أداء المهام 70-89%" },
    { key: "task_perf_50_69", value: "1.00", category: "task_performance", description: "معامل أداء المهام 50-69%" },
    { key: "task_perf_below_50", value: "0.95", category: "task_performance", description: "معامل أداء المهام أقل من 50%" },
    { key: "night_shift_start", value: "22:00", category: "shifts", description: "بداية الوردية الليلية" },
    { key: "night_shift_end", value: "06:00", category: "shifts", description: "نهاية الوردية الليلية" },
    { key: "evening_shift_start", value: "18:00", category: "shifts", description: "بداية الوردية المسائية" },
    { key: "evening_shift_end", value: "22:00", category: "shifts", description: "نهاية الوردية المسائية" },
    { key: "night_shift_factor", value: "1.50", category: "shifts", description: "معامل الوردية الليلية" },
    { key: "evening_shift_factor", value: "1.25", category: "shifts", description: "معامل الوردية المسائية" },
    { key: "tax_rate", value: "0.00", category: "tax", description: "نسبة الضريبة" },
    { key: "social_insurance_rate", value: "0.00", category: "tax", description: "نسبة التأمينات الاجتماعية" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  const permissionsData = [
    { key: "employees_view", name: "عرض الموظفين", category: "employees", description: "مشاهدة قائمة الموظفين" },
    { key: "employees_create", name: "إضافة موظف", category: "employees", description: "إضافة موظف جديد" },
    { key: "employees_edit", name: "تعديل موظف", category: "employees", description: "تعديل بيانات الموظف" },
    { key: "employees_delete", name: "حذف موظف", category: "employees", description: "حذف موظف" },
    { key: "employees_export", name: "تصدير الموظفين", category: "employees", description: "تصدير قائمة الموظفين" },
    { key: "departments_view", name: "عرض الأقسام", category: "departments", description: "مشاهدة قائمة الأقسام" },
    { key: "departments_create", name: "إضافة قسم", category: "departments", description: "إضافة قسم جديد" },
    { key: "departments_edit", name: "تعديل قسم", category: "departments", description: "تعديل بيانات القسم" },
    { key: "departments_delete", name: "حذف قسم", category: "departments", description: "حذف قسم" },
    { key: "products_view", name: "عرض المنتجات", category: "products", description: "مشاهدة قائمة المنتجات" },
    { key: "products_create", name: "إضافة منتج", category: "products", description: "إضافة منتج جديد" },
    { key: "products_edit", name: "تعديل منتج", category: "products", description: "تعديل بيانات المنتج" },
    { key: "products_delete", name: "حذف منتج", category: "products", description: "حذف منتج" },
    { key: "attendance_view", name: "عرض الحضور", category: "attendance", description: "مشاهدة سجل الحضور" },
    { key: "attendance_import", name: "استيراد الحضور", category: "attendance", description: "استيراد سجلات الحضور" },
    { key: "attendance_devices", name: "إدارة أجهزة الحضور", category: "attendance", description: "إدارة أجهزة الحضور" },
    { key: "attendance_reports", name: "تقارير الحضور", category: "attendance", description: "عرض تقارير الحضور" },
    { key: "attendance_export", name: "تصدير الحضور", category: "attendance", description: "تصدير سجلات الحضور" },
    { key: "tasks_view", name: "عرض المهام", category: "tasks", description: "مشاهدة قائمة المهام" },
    { key: "tasks_create", name: "إضافة مهمة", category: "tasks", description: "إضافة تقرير مهمة" },
    { key: "tasks_edit", name: "تعديل مهمة", category: "tasks", description: "تعديل تقرير مهمة" },
    { key: "tasks_delete", name: "حذف مهمة", category: "tasks", description: "حذف تقرير مهمة" },
    { key: "tasks_review", name: "مراجعة المهام", category: "tasks", description: "مراجعة واعتماد تقارير المهام" },
    { key: "tasks_summary", name: "ملخص المهام", category: "tasks", description: "عرض ملخص الأداء الشهري" },
    { key: "tasks_finalize", name: "اعتماد الملخص", category: "tasks", description: "اعتماد ملخص الأداء الشهري" },
    { key: "payroll_view", name: "عرض الرواتب", category: "payroll", description: "مشاهدة قائمة الرواتب" },
    { key: "payroll_create", name: "إضافة راتب", category: "payroll", description: "إضافة راتب لموظف" },
    { key: "payroll_calculate", name: "حساب الرواتب", category: "payroll", description: "حساب الرواتب تلقائياً" },
    { key: "payroll_edit", name: "تعديل راتب", category: "payroll", description: "تعديل إدخال راتب" },
    { key: "payroll_approve", name: "اعتماد الرواتب", category: "payroll", description: "اعتماد صرف الرواتب" },
    { key: "payroll_delete", name: "حذف راتب", category: "payroll", description: "حذف راتب" },
    { key: "payslip_view", name: "عرض كشف الراتب", category: "payslip", description: "مشاهدة كشف الراتب" },
    { key: "payslip_export", name: "تصدير كشف الراتب", category: "payslip", description: "تصدير كشف الراتب" },
    { key: "reports_view", name: "عرض التقارير", category: "reports", description: "مشاهدة قائمة التقارير" },
    { key: "reports_create", name: "إنشاء تقرير", category: "reports", description: "إنشاء تقرير جديد" },
    { key: "reports_edit", name: "تعديل تقرير", category: "reports", description: "تعديل تقرير" },
    { key: "reports_delete", name: "حذف تقرير", category: "reports", description: "حذف تقرير" },
    { key: "settings_view", name: "عرض الإعدادات", category: "settings", description: "مشاهدة الإعدادات" },
    { key: "settings_edit", name: "تعديل الإعدادات", category: "settings", description: "تعديل الإعدادات" },
    { key: "permissions_view", name: "عرض الصلاحيات", category: "permissions", description: "مشاهدة صلاحيات الأدوار" },
    { key: "permissions_edit", name: "تعديل الصلاحيات", category: "permissions", description: "تعديل صلاحيات الأدوار" },
    { key: "users_view", name: "عرض المستخدمين", category: "users", description: "مشاهدة قائمة المستخدمين" },
    { key: "users_create", name: "إضافة مستخدم", category: "users", description: "إضافة مستخدم جديد" },
    { key: "users_edit", name: "تعديل مستخدم", category: "users", description: "تعديل بيانات المستخدم" },
    { key: "users_delete", name: "حذف مستخدم", category: "users", description: "حذف مستخدم" },
    { key: "users_reset_password", name: "إعادة تعيين كلمة المرور", category: "users", description: "إعادة تعيين كلمة مرور مستخدم" },
    { key: "audit_view", name: "عرض السجل", category: "audit", description: "مشاهدة سجل التدقيق" },
    { key: "backup_create", name: "إنشاء نسخة احتياطية", category: "backup", description: "إنشاء نسخة احتياطية" },
    { key: "backup_restore", name: "استعادة نسخة احتياطية", category: "backup", description: "استعادة نسخة احتياطية" },
    { key: "notifications_view", name: "عرض الإشعارات", category: "notifications", description: "مشاهدة الإشعارات" },
    { key: "sales_view", name: "عرض المبيعات", category: "sales", description: "مشاهدة المبيعات الشهرية" },
    { key: "sales_edit", name: "إدخال المبيعات", category: "sales", description: "إدخال وتعديل المبيعات الشهرية" },
  ];

  for (const perm of permissionsData) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, category: perm.category, description: perm.description },
      create: perm,
    });
  }

  const rolePerms = [
    {
      role: "admin",
      keys: permissionsData.map((p) => p.key),
    },
    {
      role: "manager",
      keys: [
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
    },
    {
      role: "employee",
      keys: [
        "tasks_view", "tasks_create",
        "tasks_summary",
        "payslip_view",
        "attendance_view",
        "notifications_view",
      ],
    },
  ];

  for (const rp of rolePerms) {
    const permissions = await prisma.permission.findMany({
      where: { key: { in: rp.keys } },
    });
    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: rp.role as any, permissionId: perm.id } },
        update: {},
        create: { role: rp.role as any, permissionId: perm.id },
      });
    }
  }

  console.log("✅ تم إنشاء البيانات الأولية:");
  console.log(`  - مستخدم: admin / admin123`);
  console.log(`  - إعدادات: ${settings.length} إعداد`);
  console.log(`  - صلاحيات: ${permissionsData.length} صلاحية`);
  console.log(`  - أدوار: admin, manager, employee`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
