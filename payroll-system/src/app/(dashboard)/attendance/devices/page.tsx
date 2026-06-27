"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Wifi, WifiOff, Pencil, Trash2, Loader2, Server, Monitor } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Device {
  id: string;
  name: string;
  deviceType: "zkteco" | "hikvision";
  ipAddress: string | null;
  port: number | null;
  model: string | null;
  isActive: boolean;
  _count?: { records: number };
}

type DeviceForm = Omit<Device, "id" | "isActive" | "_count">;

const emptyForm: DeviceForm = { name: "", deviceType: "zkteco", ipAddress: "", port: 8080, model: "" };

export default function AttendanceDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeviceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (device: Device) => {
    setEditingId(device.id);
    setForm({
      name: device.name,
      deviceType: device.deviceType,
      ipAddress: device.ipAddress || "",
      port: device.port || 8080,
      model: device.model || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/attendance/devices?id=${editingId}` : "/api/attendance/devices";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        loadDevices();
      }
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الجهاز؟")) return;
    try {
      const res = await fetch(`/api/attendance/devices?id=${id}`, { method: "DELETE" });
      if (res.ok) loadDevices();
    } catch {}
  };

  const handleTest = async (device: Device) => {
    setTestingId(device.id);
    try {
      const res = await fetch("/api/attendance/devices/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: device.id }),
      });
      const ok = res.ok;
      setTestResults((prev) => ({ ...prev, [device.id]: ok }));
    } catch {
      setTestResults((prev) => ({ ...prev, [device.id]: false }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">إدارة الأجهزة</h1>
          <p className="text-sm text-muted-foreground">إدارة أجهزة الحضور ZKTeco و Hikvision</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          إضافة جهاز
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الأجهزة المسجلة</CardTitle>
          <CardDescription>{devices.length} جهاز</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Server className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">لا توجد أجهزة مسجلة</p>
              <Button variant="outline" size="sm" onClick={openNew}>إضافة جهاز</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>المنفذ</TableHead>
                  <TableHead>الموديل</TableHead>
                  <TableHead>حالة الاتصال</TableHead>
                  <TableHead>السجلات</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>
                      <Badge variant={device.deviceType === "zkteco" ? "default" : "secondary"}>
                        {device.deviceType === "zkteco" ? "ZKTeco" : "Hikvision"}
                      </Badge>
                    </TableCell>
                    <TableCell dir="ltr">{device.ipAddress || "—"}</TableCell>
                    <TableCell>{device.port || "—"}</TableCell>
                    <TableCell>{device.model || "—"}</TableCell>
                    <TableCell>
                      {testingId === device.id ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : testResults[device.id] === true ? (
                        <span className="flex items-center gap-1 text-xs text-green-500"><Wifi className="size-3" />متصل</span>
                      ) : testResults[device.id] === false ? (
                        <span className="flex items-center gap-1 text-xs text-red-500"><WifiOff className="size-3" />غير متصل</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{device._count?.records ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => handleTest(device)} title="اختبار الاتصال">
                          <Wifi className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(device)} title="تعديل">
                          <Pencil className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(device.id)} title="حذف">
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل جهاز" : "إضافة جهاز جديد"}</DialogTitle>
            <DialogDescription>أدخل بيانات الجهاز للاتصال به واستيراد البيانات</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>اسم الجهاز</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثل: جهاز ZKTeco - الدور الأول" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>نوع الجهاز</Label>
              <Select value={form.deviceType} onValueChange={(v) => v && setForm((f) => ({ ...f, deviceType: v as "zkteco" | "hikvision" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zkteco">ZKTeco</SelectItem>
                  <SelectItem value="hikvision">Hikvision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>عنوان IP</Label>
                <Input value={form.ipAddress || ""} onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))} placeholder="192.168.1.100" dir="ltr" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>المنفذ</Label>
                <Input type="number" value={form.port || ""} onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value) || 0 }))} placeholder="8080" dir="ltr" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>الموديل</Label>
              <Input value={form.model || ""} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="مثل: uFace 800, iDS-1004" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {editingId ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
