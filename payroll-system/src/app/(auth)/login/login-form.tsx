"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, UserCircle } from "lucide-react"
import { authenticate } from "./actions"

export function LoginForm() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    try {
      await authenticate(username, password)
      router.push("/")
      router.refresh()
    } catch (err: any) {
      if (err?.message?.includes("NEXT_REDIRECT")) throw err
      setError("اسم المستخدم أو كلمة المرور غير صحيحة")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary/10">
          <UserCircle className="size-8 text-primary" />
        </div>
        <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
        <CardDescription>نظام إدارة الرواتب</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">اسم المستخدم</Label>
            <Input
              id="username"
              name="username"
              placeholder="أدخل اسم المستخدم"
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="أدخل كلمة المرور"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
