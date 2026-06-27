"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  ClipboardCheck,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  Shield,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/employees", label: "الموظفين", icon: Users },
  { href: "/departments", label: "الأقسام", icon: Building2 },
  { href: "/products", label: "الأصناف", icon: Package },
  { href: "/attendance", label: "الحضور والغياب", icon: ClipboardCheck },
  { href: "/tasks", label: "المهام", icon: FileText },
  { href: "/sales", label: "المبيعات", icon: ShoppingCart },
  { href: "/payroll", label: "المرتبات", icon: DollarSign },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/settings", label: "الإعدادات", icon: Settings },
  { href: "/permissions", label: "الصلاحيات", icon: Shield, adminOnly: true },
  { href: "/users", label: "المستخدمين", icon: Users, adminOnly: true },
]

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || role === "admin"
  )

  return (
    <nav className="flex-1 overflow-y-auto p-3">
      <ul className="space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href))

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
