export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { saveRolePermissions } from "./actions"

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  manager: "مدير",
  employee: "موظف",
}

const roleColors: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  manager: "secondary",
  employee: "outline",
}

const categoryLabels: Record<string, string> = {
  employees: "الموظفين",
  departments: "الأقسام",
  products: "الأصناف",
  attendance: "الحضور والغياب",
  tasks: "المهام",
  payroll: "المرتبات",
  payslip: "كشوف المرتبات",
  reports: "التقارير",
  settings: "الإعدادات",
  permissions: "الصلاحيات",
  users: "المستخدمين",
  audit: "سجل التدقيق",
  backup: "النسخ الاحتياطي",
  notifications: "الإشعارات",
}

async function PermissionsPage() {
  const session = await auth()
  const user = session?.user as { role: string } | undefined
  if (!user || user.role !== "admin") redirect("/")

  const permissions = await prisma.permission.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] })
  const rolePerms = await prisma.rolePermission.findMany()

  const grouped = permissions.reduce<Record<string, typeof permissions>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  const rolePermMap = new Map<string, Set<string>>()
  for (const rp of rolePerms) {
    if (!rolePermMap.has(rp.role)) rolePermMap.set(rp.role, new Set())
    rolePermMap.get(rp.role)!.add(rp.permissionId)
  }

  const roles = ["admin", "manager", "employee"]

  async function saveAll(formData: FormData) {
    "use server"
    const entries = Array.from(formData.entries())
    for (const role of roles) {
      const keys = entries
        .filter(([k]) => k.startsWith(`perm_${role}_`))
        .map(([k]) => k.replace(`perm_${role}_`, ""))
      await saveRolePermissions(role, keys)
    }
    redirect("/permissions")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">الصلاحيات</h1>
        <p className="text-sm text-muted-foreground">إدارة صلاحيات الأدوار</p>
      </div>

      <form action={saveAll}>
        <div className="flex flex-wrap gap-4 border-b pb-4 mb-6">
          {roles.map((role) => (
            <a
              key={role}
              href={`#role-${role}`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Badge variant={roleColors[role]}>{roleLabels[role]}</Badge>
            </a>
          ))}
        </div>

        <div className="space-y-6">
          {roles.map((role) => {
            const rolePermSet = rolePermMap.get(role) ?? new Set()
            const isAdmin = role === "admin"
            return (
              <Card key={role} id={`role-${role}`}>
                <CardHeader>
                  <CardTitle>
                    <Badge variant={roleColors[role]} className="text-base px-3 py-1">
                      {roleLabels[role]}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {isAdmin ? "جميع الصلاحيات مفعلة تلقائياً لدور المدير" : "اختر الصلاحيات الممنوحة لهذا الدور"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isAdmin ? (
                    <p className="text-sm text-muted-foreground">دور المدير يمتلك جميع الصلاحيات بشكل تلقائي.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(grouped).map(([category, perms]) => (
                        <fieldset key={category}>
                          <legend className="text-sm font-medium mb-2">{categoryLabels[category] || category}</legend>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {perms.map((perm) => (
                              <label
                                key={perm.id}
                                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  name={`perm_${role}_${perm.key}`}
                                  defaultChecked={rolePermSet.has(perm.id)}
                                  className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span>{perm.name}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="submit">حفظ الصلاحيات</Button>
        </div>
      </form>
    </div>
  )
}

export default PermissionsPage
