export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react"
import { createProduct, updateProduct, deleteProduct } from "./actions"

async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">إدارة الأصناف</h1>
        <Dialog>
          <DialogTrigger render={<Button><PlusIcon /> إضافة صنف</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة صنف جديد</DialogTitle>
              <DialogDescription>إدخال بيانات الصنف</DialogDescription>
            </DialogHeader>
            <form action={createProduct}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code">كود الصنف</Label>
                    <Input id="code" name="code" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">الاسم</Label>
                    <Input id="name" name="name" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="purchasePrice">سعر الشراء</Label>
                    <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="salePrice">سعر البيع</Label>
                    <Input id="salePrice" name="salePrice" type="number" step="0.01" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currentStock">المخزون</Label>
                    <Input id="currentStock" name="currentStock" type="number" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reorderLevel">الحد الأدنى</Label>
                    <Input id="reorderLevel" name="reorderLevel" type="number" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline">إلغاء</Button>} />
                <Button type="submit">إضافة</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>كود الصنف</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>سعر الشراء</TableHead>
              <TableHead>سعر البيع</TableHead>
              <TableHead>المخزون</TableHead>
              <TableHead>الحد الأدنى</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-24">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  لا يوجد أصناف
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs">{product.code}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{Number(product.purchasePrice).toFixed(2)}</TableCell>
                <TableCell>{Number(product.salePrice).toFixed(2)}</TableCell>
                <TableCell>{product.currentStock}</TableCell>
                <TableCell>{product.reorderLevel}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      product.currentStock <= product.reorderLevel
                        ? "destructive"
                        : "default"
                    }
                  >
                    {product.currentStock <= product.reorderLevel
                      ? "مخزون منخفض"
                      : "متوفر"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button variant="ghost" size="icon-sm">
                            <PencilIcon className="size-4" />
                          </Button>
                        }
                      />
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>تعديل الصنف</DialogTitle>
                          <DialogDescription>تعديل بيانات الصنف</DialogDescription>
                        </DialogHeader>
                        <form action={updateProduct}>
                          <input type="hidden" name="id" value={product.id} />
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-code">كود الصنف</Label>
                                <Input id="edit-code" name="code" defaultValue={product.code} required />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-name">الاسم</Label>
                                <Input id="edit-name" name="name" defaultValue={product.name} required />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-purchase">سعر الشراء</Label>
                                <Input id="edit-purchase" name="purchasePrice" type="number" step="0.01" defaultValue={Number(product.purchasePrice)} />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-sale">سعر البيع</Label>
                                <Input id="edit-sale" name="salePrice" type="number" step="0.01" defaultValue={Number(product.salePrice)} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-stock">المخزون</Label>
                                <Input id="edit-stock" name="currentStock" type="number" defaultValue={product.currentStock} />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-reorder">الحد الأدنى</Label>
                                <Input id="edit-reorder" name="reorderLevel" type="number" defaultValue={product.reorderLevel} />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose render={<Button variant="outline">إلغاء</Button>} />
                            <Button type="submit">حفظ</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={product.id} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={(e) => {
                          if (!confirm("تأكيد حذف الصنف؟")) e.preventDefault()
                        }}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default ProductsPage
