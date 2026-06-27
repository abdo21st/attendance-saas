"use client"

import { Button } from "@/components/ui/button"
import { TrashIcon } from "lucide-react"
import { deleteEmployee } from "./actions"

export function DeleteEmployeeButton({ id }: { id: string }) {
  return (
    <form action={deleteEmployee}>
      <input type="hidden" name="id" value={id} />
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive"
        onClick={(e) => {
          if (!confirm("تأكيد حذف الموظف؟")) e.preventDefault()
        }}
      >
        <TrashIcon className="size-4" />
      </Button>
    </form>
  )
}