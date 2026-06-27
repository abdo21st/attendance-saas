export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { updateSettings } from "./actions"

const defaultTabs = [
  { id: "general", label: "عام" },
  { id: "experience", label: "معامل الخبرة" },
  { id: "conduct", label: "معامل السلوك" },
  { id: "sales", label: "المبيعات" },
  { id: "commitment", label: "الالتزام" },
  { id: "shifts", label: "الورديات" },
  { id: "taxes", label: "الضرائب" },
]

const experienceYears = [
  { key: "experience_0", label: "أقل من سنة", value: "1.00" },
  { key: "experience_1", label: "1-3 سنوات", value: "1.05" },
  { key: "experience_3", label: "3-5 سنوات", value: "1.10" },
  { key: "experience_5", label: "5-10 سنوات", value: "1.15" },
  { key: "experience_10", label: "أكثر من 10 سنوات", value: "1.20" },
]

const conductLevels = [
  { key: "conduct_excellent", label: "ممتاز", value: "1.05" },
  { key: "conduct_good", label: "جيد", value: "1.02" },
  { key: "conduct_average", label: "متوسط", value: "1.00" },
  { key: "conduct_below", label: "دون المتوسط", value: "0.98" },
  { key: "conduct_poor", label: "ضعيف", value: "0.95" },
]

async function SettingsPage() {
  const allSettings = await prisma.setting.findMany()

  const get = (key: string, fallback = "") =>
    allSettings.find((s) => s.key === key)?.value || fallback

  async function saveAll(formData: FormData) {
    "use server"
    const entries = Array.from(formData.entries())
      .filter(([k]) => k.startsWith("setting_"))
      .map(([k, v]) => ({ key: k.replace("setting_", ""), value: v as string }))
    await updateSettings(entries)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">إعدادات النظام العامة</p>
      </div>

      <form action={saveAll}>
        <div className="flex flex-wrap gap-4 border-b pb-4 mb-6">
          {defaultTabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {tab.label}
            </a>
          ))}
        </div>

        <div className="space-y-6">
          <Card id="general">
            <CardHeader>
              <CardTitle>عام</CardTitle>
              <CardDescription>البيانات الأساسية للشركة</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="company_name">اسم الشركة</Label>
                <Input id="company_name" name="setting_company_name" defaultValue={get("company_name", "الشركة")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">العملة</Label>
                <Input id="currency" name="setting_currency" defaultValue={get("currency", "ريال")} />
              </div>
            </CardContent>
          </Card>

          <Card id="experience">
            <CardHeader>
              <CardTitle>معامل الخبرة</CardTitle>
              <CardDescription>معامل الزيادة حسب سنوات الخبرة</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {experienceYears.map((exp) => (
                <div key={exp.key} className="grid gap-2">
                  <Label htmlFor={exp.key}>{exp.label}</Label>
                  <Input id={exp.key} name={`setting_${exp.key}`} type="number" step="0.01" defaultValue={get(exp.key, exp.value)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card id="conduct">
            <CardHeader>
              <CardTitle>معامل السلوك</CardTitle>
              <CardDescription>معامل تقييم السلوك الوظيفي</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {conductLevels.map((c) => (
                <div key={c.key} className="grid gap-2">
                  <Label htmlFor={c.key}>{c.label}</Label>
                  <Input id={c.key} name={`setting_${c.key}`} type="number" step="0.01" defaultValue={get(c.key, c.value)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card id="sales">
            <CardHeader>
              <CardTitle>المبيعات</CardTitle>
              <CardDescription>معاملات تحقيق المستهدف البيعي</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sales_reached">معامل الوصول للمستهدف</Label>
                <Input id="sales_reached" name="setting_sales_reached" type="number" step="0.01" defaultValue={get("sales_reached", "1.10")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sales_not_reached">معامل عدم الوصول للمستهدف</Label>
                <Input id="sales_not_reached" name="setting_sales_not_reached" type="number" step="0.01" defaultValue={get("sales_not_reached", "0.95")} />
              </div>
            </CardContent>
          </Card>

          <Card id="commitment">
            <CardHeader>
              <CardTitle>الالتزام</CardTitle>
              <CardDescription>نسبة التنقيص لعدم الالتزام</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="commitment_deduction">نسبة التنقيص القصوى (%)</Label>
                <Input id="commitment_deduction" name="setting_commitment_deduction" type="number" step="0.01" defaultValue={get("commitment_deduction", "0.10")} />
              </div>
            </CardContent>
          </Card>

          <Card id="shifts">
            <CardHeader>
              <CardTitle>الورديات</CardTitle>
              <CardDescription>أوقات ومعاملات الورديات</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="shift_morning_start">بداية الوردية الصباحية</Label>
                <Input id="shift_morning_start" name="setting_shift_morning_start" defaultValue={get("shift_morning_start", "06:00")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shift_evening_start">بداية الوردية المسائية</Label>
                <Input id="shift_evening_start" name="setting_shift_evening_start" defaultValue={get("shift_evening_start", "14:00")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shift_night_start">بداية الوردية الليلية</Label>
                <Input id="shift_night_start" name="setting_shift_night_start" defaultValue={get("shift_night_start", "22:00")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shift_night_factor">معامل الوردية الليلية</Label>
                <Input id="shift_night_factor" name="setting_shift_night_factor" type="number" step="0.01" defaultValue={get("shift_night_factor", "1.50")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shift_overtime_factor">معامل العمل الإضافي</Label>
                <Input id="shift_overtime_factor" name="setting_shift_overtime_factor" type="number" step="0.01" defaultValue={get("shift_overtime_factor", "1.25")} />
              </div>
            </CardContent>
          </Card>

          <Card id="taxes">
            <CardHeader>
              <CardTitle>الضرائب والتأمينات</CardTitle>
              <CardDescription>نسب الضريبة والتأمينات الاجتماعية</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tax_rate">نسبة الضريبة (%)</Label>
                <Input id="tax_rate" name="setting_tax_rate" type="number" step="0.01" defaultValue={get("tax_rate", "0.10")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="social_insurance">نسبة التأمينات الاجتماعية (%)</Label>
                <Input id="social_insurance" name="setting_social_insurance" type="number" step="0.01" defaultValue={get("social_insurance", "0.11")} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit">حفظ جميع الإعدادات</Button>
        </div>
      </form>
    </div>
  )
}

export default SettingsPage
