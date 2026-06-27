"use client"

import { Button } from "@/components/ui/button"
import { TrashIcon } from "lucide-react"
import { deleteDepartment } from "./actions"

export function DeleteDepartmentButton({ id }: { id: string }) {
  return (
    <form action={deleteDepartment}>
      <input type="hidden" name="id" value={id} />
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive"
        onClick={(e) => {
          if (!confirm("تأكيد حذف القسم؟")) e.preventDefault()
        }}
      >
        <TrashIcon className="size-4" />
      </Button>
    </form>
  )
}
