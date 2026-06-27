"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldValue } from "@/components/reports/field-value";
import {
  DATA_SOURCES,
  getFieldsForSource,
  type ReportFilter,
} from "@/lib/report-definitions";
import {
  getReportTemplateById,
  executeReportAction,
  exportExcelAction,
  exportPDFAction,
} from "../actions";
import {
  Download,
  FileDown,
  BarChart3,
  LineChart,
  PieChart,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const OPERATORS = [
  { value: "equals", label: "يساوي" },
  { value: "not_equals", label: "لا يساوي" },
  { value: "contains", label: "يحتوي على" },
  { value: "greater_than", label: "أكبر من" },
  { value: "less_than", label: "أقل من" },
  { value: "between", label: "بين" },
  { value: "in", label: "في" },
];

const CHART_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function ReportViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [tempFilters, setTempFilters] = useState<ReportFilter[]>([]);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const availableFields = template ? getFieldsForSource(template.dataSource) : [];
  const fieldDefs = template
    ? availableFields.filter((f: any) => (template.fields as string[]).includes(f.key))
    : [];

  useEffect(() => {
    async function load() {
      try {
        const t = await getReportTemplateById(id);
        if (!t) {
          setError("التقرير غير موجود");
          return;
        }
        setTemplate(t);
      } catch {
        setError("حدث خطأ أثناء تحميل التقرير");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const runReport = useCallback(async () => {
    if (!template) return;
    setExecuting(true);
    setError("");
    try {
      const result = await executeReportAction(template, tempFilters);
      setData(result);
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء تنفيذ التقرير");
    } finally {
      setExecuting(false);
    }
  }, [template, tempFilters]);

  useEffect(() => {
    if (template) runReport();
  }, [template, runReport]);

  const addTempFilter = useCallback(() => {
    setTempFilters((prev) => [
      ...prev,
      { field: availableFields[0]?.key || "", operator: "equals", value: "" },
    ]);
  }, [availableFields]);

  const updateTempFilter = useCallback((idx: number, updates: Partial<ReportFilter>) => {
    setTempFilters((prev) => prev.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  }, []);

  const removeTempFilter = useCallback((idx: number) => {
    setTempFilters((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleExportExcel = useCallback(async () => {
    if (!data) return;
    setExporting("excel");
    try {
      const result = await exportExcelAction(data, template.name);
      const blob = new Blob([new Uint8Array(result.buffer)], { type: result.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${template.name}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("حدث خطأ أثناء تصدير Excel");
    } finally {
      setExporting(null);
    }
  }, [data, template]);

  const handleExportPDF = useCallback(async () => {
    if (!data) return;
    setExporting("pdf");
    try {
      const result = await exportPDFAction(data, template.name);
      const blob = new Blob([new Uint8Array(result.buffer)], { type: result.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${template.name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("حدث خطأ أثناء تصدير PDF");
    } finally {
      setExporting(null);
    }
  }, [data, template]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!template) return null;

  const sourceConfig = DATA_SOURCES[template.dataSource as keyof typeof DATA_SOURCES];
  const chartData =
    data && template.chartType && template.chartType !== "none"
      ? data.rows.map((row) => {
          const obj: Record<string, any> = {};
          data.columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        })
      : [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{template.name}</h1>
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{sourceConfig?.label || template.dataSource}</Badge>
            {template.chartType && (
              <Badge variant="outline">
                {template.chartType === "bar" ? "أعمدة" : template.chartType === "line" ? "خطي" : "دائري"}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={!data || exporting !== null}
          >
            <Download /> {exporting === "excel" ? "..." : "Excel"}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={!data || exporting !== null}
          >
            <FileDown /> {exporting === "pdf" ? "..." : "PDF"}
          </Button>
          <Button variant="ghost" onClick={() => router.push(`/reports/designer?id=${id}`)}>
            تعديل
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Temporary filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">شروط مؤقتة</CardTitle>
            <Button variant="outline" size="sm" onClick={addTempFilter}>
              <Plus /> إضافة شرط
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tempFilters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا توجد شروط مؤقتة - يتم عرض التقرير بالشروط المحفوظة
            </p>
          ) : (
            <div className="space-y-3">
              {tempFilters.map((filter, idx) => (
                <div key={idx} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">الحقل</Label>
                    <select
                      value={filter.field}
                      onChange={(e) => updateTempFilter(idx, { field: e.target.value })}
                      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      {availableFields.map((f: any) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">العامل</Label>
                    <select
                      value={filter.operator}
                      onChange={(e) =>
                        updateTempFilter(idx, { operator: e.target.value as any })
                      }
                      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">القيمة</Label>
                    <Input
                      value={filter.value || ""}
                      onChange={(e) => updateTempFilter(idx, { value: e.target.value })}
                      placeholder="القيمة"
                      className="h-8 w-32"
                    />
                  </div>
                  {filter.operator === "between" && (
                    <div className="grid gap-1.5">
                      <Label className="text-xs">إلى</Label>
                      <Input
                        value={filter.value2 || ""}
                        onChange={(e) => updateTempFilter(idx, { value2: e.target.value })}
                        placeholder="القيمة الثانية"
                        className="h-8 w-32"
                      />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    onClick={() => removeTempFilter(idx)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button onClick={runReport} disabled={executing} size="sm">
                {executing ? "..." : "تحديث النتائج"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      {template.chartType && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الرسم البياني</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              {template.chartType === "bar" ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey={data?.columns[0] || ""}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar
                    dataKey={data?.columns[1] || ""}
                    fill="var(--color-primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : template.chartType === "line" ? (
                <ReLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey={data?.columns[0] || ""}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey={data?.columns[1] || ""}
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </ReLineChart>
              ) : (
                <RePieChart>
                  <Pie
                    data={chartData}
                    dataKey={data?.columns[1] || ""}
                    nameKey={data?.columns[0] || ""}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label
                  >
                    {chartData.map((_entry: any, idx: number) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RePieChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              النتائج
              {data && (
                <span className="text-sm font-normal text-muted-foreground mr-2">
                  ({data.rows.length} سجل)
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {executing ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {data.columns.map((col, i) => (
                    <TableHead key={i}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={data.columns.length} className="text-center text-muted-foreground">
                      لا توجد نتائج للشروط المحددة
                    </TableCell>
                  </TableRow>
                ) : (
                  data.rows.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell: any, j: number) => (
                        <TableCell key={j}>
                          <FieldValue value={cell} type={fieldDefs[j]?.type || "text"} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-12">اضغط على تشغيل لعرض النتائج</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
