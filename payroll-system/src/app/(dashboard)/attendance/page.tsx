"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, History, Monitor, FileText, AlertCircle, CheckCircle2, XCircle, Eye, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tab = "upload" | "direct" | "history";

interface ImportPreview {
  records: { employeeCode: string; date: string; checkIn: string; checkOut: string; status: string }[];
  fileName: string;
}

interface ImportHistory {
  id: string;
  importType: string;
  fileName: string | null;
  deviceType: string | null;
  totalRecords: number;
  importedRecords: number;
  failedRecords: number;
  status: string;
  createdAt: string;
  importedBy: { fullName: string };
  _count: { records: number };
}

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [deviceType, setDeviceType] = useState("auto");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    batchId: string; total: number; imported: number; failed: number; errors?: { row: number; error: string }[];
  } | null>(null);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "upload", label: "رفع ملف", icon: <Upload className="size-4" /> },
    { id: "direct", label: "اتصال مباشر", icon: <Monitor className="size-4" /> },
    { id: "history", label: "سجل الاستيراد", icon: <History className="size-4" /> },
  ];

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    const text = await file.text();
    const { autoDetectFormat, parseZKTecoCSV, parseHikvisionCSV } = await import("@/lib/attendance-parser");
    const fmt = deviceType === "auto" ? autoDetectFormat(text) : deviceType;
    const records = fmt === "zkteco" ? parseZKTecoCSV(text) : parseHikvisionCSV(text);
    setPreview({ records, fileName: file.name });
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setImportResult(null);
    try {
      const file = fileInputRef.current?.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("deviceType", deviceType);
      const res = await fetch("/api/attendance/import", { method: "POST", body: formData });
      const data = await res.json();
      setImportResult(data);
      if (activeTab === "history") loadHistory();
    } catch {
      setImportResult(null);
    } finally {
      setImporting(false);
    }
  };

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(false);
    try {
      const res = await fetch("/api/attendance/import");
      const data = await res.json();
      setHistory(data.batches || []);
    } catch {
      setHistoryError(true);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "history") loadHistory();
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = { completed: "default", processing: "secondary", failed: "destructive" };
    const labels: Record<string, string> = { completed: "مكتمل", processing: "قيد المعالجة", failed: "فاشل" };
    return <Badge variant={variants[status] as any || "outline"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">استيراد الحضور</h1>
          <p className="text-sm text-muted-foreground">استيراد بيانات الحضور من أجهزة ZKTeco و Hikvision</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "upload" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>رفع ملف الحضور</CardTitle>
                <CardDescription>Excel أو CSV - اختر نوع الجهاز ثم ارفع الملف</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">نوع الجهاز</Label>
                  <Select value={deviceType} onValueChange={(v) => v && setDeviceType(v)}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">اكتشاف تلقائي</SelectItem>
                      <SelectItem value="zkteco">ZKTeco</SelectItem>
                      <SelectItem value="hikvision">Hikvision</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
                    dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                >
                  <Upload className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">اسحب الملف إلى هنا أو اضغط للاختيار</p>
                  <p className="text-xs text-muted-foreground">Excel (.xlsx, .xls) أو CSV</p>
                  <Input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
                </div>
              </CardContent>
            </Card>

            {preview && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="size-4" />
                    معاينة: {preview.fileName}
                  </CardTitle>
                  <CardDescription>{preview.records.length} سجل</CardDescription>
                </CardHeader>
                <CardContent className="max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>كود الموظف</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحضور</TableHead>
                        <TableHead>الانصراف</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.records.slice(0, 100).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell dir="ltr" className="font-medium">{r.employeeCode}</TableCell>
                          <TableCell>{r.date}</TableCell>
                          <TableCell>{r.checkIn || "—"}</TableCell>
                          <TableCell>{r.checkOut || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === "present" ? "default" : "secondary"}>{r.status === "present" ? "حاضر" : r.status === "absent" ? "غائب" : r.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {preview.records.length > 100 && (
                    <p className="mt-2 text-center text-xs text-muted-foreground">عرض 100 من أصل {preview.records.length} سجل</p>
                  )}
                </CardContent>
                <CardFooter className="justify-between">
                  <p className="text-xs text-muted-foreground">{preview.records.length} سجل للاستيراد</p>
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    {importing ? "جارٍ الاستيراد..." : "استيراد"}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {importResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {importResult.failed === 0 ? <CheckCircle2 className="size-4 text-green-500" /> : importResult.imported > 0 ? <AlertCircle className="size-4 text-amber-500" /> : <XCircle className="size-4 text-red-500" />}
                    نتيجة الاستيراد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-2xl font-bold">{importResult.total}</p>
                      <p className="text-xs text-muted-foreground">الإجمالي</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-2xl font-bold text-green-500">{importResult.imported}</p>
                      <p className="text-xs text-muted-foreground">تم الاستيراد</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className={`text-2xl font-bold ${importResult.failed > 0 ? "text-red-500" : "text-muted-foreground"}`}>{importResult.failed}</p>
                      <p className="text-xs text-muted-foreground">فاشل</p>
                    </div>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-4 max-h-32 overflow-auto rounded-lg bg-destructive/5 p-3">
                      <p className="mb-1 text-xs font-medium text-destructive">الأخطاء:</p>
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-destructive/80">الصف {e.row}: {e.error}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye className="size-4" />تعليمات</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>ZKTeco:</strong> ارفع ملف CSV يحتوي على UserID, Date, Time, Status</p>
              <p><strong>Hikvision:</strong> ارفع ملف CSV يحتوي على Employee ID, Date, Time, Direction</p>
              <p><strong>Excel:</strong> يدعم كلا التنسيقين مع الكشف التلقائي</p>
              <hr className="my-2" />
              <p className="text-xs">يجب أن تكون أكواد الموظفين مطابقة للأكواد المسجلة في النظام</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "direct" && (
        <Card>
          <CardHeader>
            <CardTitle>اتصال مباشر بالجهاز</CardTitle>
            <CardDescription>هذه الميزة قيد التطوير</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">سنوفر قريباً إمكانية الاتصال المباشر بأجهزة ZKTeco و Hikvision عبر SDK.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle>سجل الاستيراد</CardTitle>
            <CardDescription>جميع عمليات استيراد بيانات الحضور</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : historyError ? (
              <p className="text-center text-sm text-destructive">فشل تحميل السجل</p>
            ) : history.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">لا توجد عمليات استيراد سابقة</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الملف</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المستورد</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>تم</TableHead>
                    <TableHead>فاشل</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs">{new Date(b.createdAt).toLocaleString("ar-EG")}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{b.fileName || "—"}</TableCell>
                      <TableCell>{b.deviceType === "zkteco" ? "ZKTeco" : b.deviceType === "hikvision" ? "Hikvision" : "—"}</TableCell>
                      <TableCell>{b.importedBy.fullName}</TableCell>
                      <TableCell>{b.totalRecords}</TableCell>
                      <TableCell className="text-green-500">{b.importedRecords}</TableCell>
                      <TableCell className={b.failedRecords > 0 ? "text-red-500" : ""}>{b.failedRecords}</TableCell>
                      <TableCell>{statusBadge(b.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
