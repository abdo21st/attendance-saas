import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { DollarSign, Menu, LogOut } from "lucide-react"
import { SidebarNav } from "./sidebar-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = session.user as {
    id: string
    name: string
    role: string
    email: string
  }

  async function handleSignOut() {
    "use server"
    await signOut()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-l bg-sidebar md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <DollarSign className="size-5 text-primary" />
          </div>
          <span className="text-sm font-semibold">نظام الرواتب</span>
        </div>
        <SidebarNav role={user.role} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-40 md:hidden"
            >
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-60 p-0">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="size-5 text-primary" />
            </div>
            <span className="text-sm font-semibold">نظام الرواتب</span>
          </div>
          <SidebarNav role={user.role} />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="md:hidden" />
          <div className="flex items-center gap-2">
            <form action={handleSignOut}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">تسجيل الخروج</span>
              </Button>
            </form>
            <Separator orientation="vertical" className="h-6" />
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {user.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user.name}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
