"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveReportTemplate } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { id: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جاري الحفظ..." : "حفظ"}
    </Button>
  );
}

export function ReportSaveForm({
  onSuccess,
  defaultValues,
}: {
  onSuccess: (id: string) => void;
  defaultValues?: { id?: string; name?: string; description?: string };
}) {
  const [state, formAction] = useFormState(
    async (_prev: any, formData: FormData) => {
      const data = {
        id: formData.get("id") as string || undefined,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        dataSource: formData.get("dataSource") as string,
        fields: JSON.parse(formData.get("fields") as string),
        filters: formData.get("filters") ? JSON.parse(formData.get("filters") as string) : undefined,
        sortBy: formData.get("sortBy") ? JSON.parse(formData.get("sortBy") as string) : undefined,
        groupBy: formData.get("groupBy") as string || undefined,
        showTotals: formData.get("showTotals") === "true",
        chartType: formData.get("chartType") as string || undefined,
        isShared: formData.get("isShared") === "true",
      };
      const id = await saveReportTemplate(data);
      onSuccess(id);
      return { id };
    },
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={defaultValues?.id || ""} />
      <div className="grid gap-2">
        <Label htmlFor="name">اسم التقرير</Label>
        <Input id="name" name="name" defaultValue={defaultValues?.name} required placeholder="أدخل اسم التقرير" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">الوصف (اختياري)</Label>
        <Input id="description" name="description" defaultValue={defaultValues?.description} placeholder="وصف مختصر للتقرير" />
      </div>
      <SubmitButton />
    </form>
  );
}
