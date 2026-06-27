"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DATA_SOURCES,
  getFieldsForSource,
  getDefaultFields,
  OPERATORS,
  type ReportField,
  type ReportFilter,
} from "@/lib/report-builder-types";
import { FieldValue } from "@/components/reports/field-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  BarChart3,
  LineChart,
  PieChart,
  Save,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { saveReportTemplate, executeReportAction } from "../actions";

const CHART_TYPES = [
  { value: "", label: "بدون رسم بياني" },
  { value: "bar", label: "أعمدة", icon: BarChart3 },
  { value: "line", label: "خطي", icon: LineChart },
  { value: "pie", label: "دائري", icon: PieChart },
];

export default function ReportDesignerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [step, setStep] = useState(1);
  const [dataSource, setDataSource] = useState("");
  const [availableFields, setAvailableFields] = useState<ReportField[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sortBy, setSortBy] = useState<
    { field: string; direction: "asc" | "desc" }[]
  >([]);
  const [groupBy, setGroupBy] = useState("");
  const [showTotals, setShowTotals] = useState(false);
  const [chartType, setChartType] = useState("");
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [previewData, setPreviewData] = useState<{
    columns: string[];
    rows: any[][];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (dataSource) {
      setAvailableFields(getFieldsForSource(dataSource));
    }
  }, [dataSource]);

  const handleDataSourceSelect = useCallback((source: string) => {
    setDataSource(source);
    setSelectedFields(getDefaultFields(source));
    setFilters([]);
    setSortBy([]);
    setGroupBy("");
    setChartType("");
    setPreviewData(null);
    setStep(2);
  }, []);

  const toggleField = useCallback((key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key)
        ? prev.filter((f) => f !== key)
        : [...prev, key]
    );
  }, []);

  const moveField = useCallback(
    (key: string, direction: "up" | "down") => {
      setSelectedFields((prev) => {
        const idx = prev.indexOf(key);
        if (idx === -1) return prev;
        const newArr = [...prev];
        if (direction === "up" && idx > 0) {
          [newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]];
        } else if (direction === "down" && idx < newArr.length - 1) {
          [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
        }
        return newArr;
      });
    },
    []
  );

  const addFilter = useCallback(() => {
    setFilters((prev) => [
      ...prev,
      { field: availableFields[0]?.key || "", operator: "equals", value: "" },
    ]);
  }, [availableFields]);

  const updateFilter = useCallback(
    (idx: number, updates: Partial<ReportFilter>) => {
      setFilters((prev) =>
        prev.map((f, i) => (i === idx ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const removeFilter = useCallback((idx: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addSort = useCallback(() => {
    setSortBy((prev) => [
      ...prev,
      { field: availableFields[0]?.key || "", direction: "asc" },
    ]);
  }, [availableFields]);

  const updateSort = useCallback(
    (
      idx: number,
      updates: Partial<{ field: string; direction: "asc" | "desc" }>
    ) => {
      setSortBy((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const removeSort = useCallback((idx: number) => {
    setSortBy((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const runPreview = useCallback(async () => {
    setPreviewLoading(true);
    setError("");
    try {
      const result = await executeReportAction(
        {
          dataSource,
          fields: selectedFields,
          filters,
          sortBy,
          groupBy,
        },
        []
      );
      setPreviewData(result);
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء تنفيذ التقرير");
    } finally {
      setPreviewLoading(false);
    }
  }, [dataSource, selectedFields, filters, sortBy, groupBy]);

  const handleSave = useCallback(async () => {
    if (!reportName.trim()) {
      setError("يرجى إدخال اسم التقرير");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const id = await saveReportTemplate({
        id: editId || undefined,
        name: reportName,
        description: reportDescription,
        dataSource,
        fields: selectedFields,
        filters,
        sortBy,
        groupBy: groupBy || undefined,
        showTotals,
        chartType: chartType || undefined,
        isShared,
      });
      router.push(`/reports/${id}`);
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }, [
    reportName,
    reportDescription,
    dataSource,
    selectedFields,
    filters,
    sortBy,
    groupBy,
    showTotals,
    chartType,
    isShared,
    editId,
    router,
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {editId ? "تعديل التقرير" : "تصميم تقرير جديد"}
        </h1>
        <p className="text-sm text-muted-foreground">
          اتبع الخطوات لإنشاء تقرير مخصص
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { num: 1, label: "مصدر البيانات" },
          { num: 2, label: "الحقول" },
          { num: 3, label: "الشروط" },
          { num: 4, label: "الترتيب" },
          { num: 5, label: "الرسم البياني" },
          { num: 6, label: "الحفظ" },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              step === s.num
                ? "bg-primary text-primary-foreground"
                : step > s.num
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span className="flex size-5 items-center justify-center rounded-full text-xs font-bold">
              {s.num}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Data Source */}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(DATA_SOURCES).map(([key, src]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
                dataSource === key
                  ? "ring-2 ring-primary bg-primary/5"
                  : ""
              }`}
              onClick={() => handleDataSourceSelect(key)}
            >
              <CardHeader>
                <CardTitle className="text-base">{src.label}</CardTitle>
                <CardDescription>
                  {src.fields.length} حقل متاح
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {src.fields.slice(0, 4).map((f) => (
                    <Badge key={f.key} variant="secondary" className="text-xs">
                      {f.label}
                    </Badge>
                  ))}
                  {src.fields.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{src.fields.length - 4}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Fields */}
      {step === 2 && dataSource && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">الحقول المتاحة</CardTitle>
              <CardDescription>اختر الحقول التي تريد عرضها</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {availableFields.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={() => toggleField(field.key)}
                      className="size-4 rounded border-input accent-primary"
                    />
                    <div className="flex-1">
                      <div>{field.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {field.type}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">الحقول المختارة</CardTitle>
              <CardDescription>
                رتب الحقول بالأسهم ({selectedFields.length} حقل)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لم يتم اختيار أي حقول بعد
                </p>
              ) : (
                <div className="space-y-1">
                  {selectedFields.map((key, idx) => {
                    const field = availableFields.find((f) => f.key === key);
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                      >
                        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                          {idx + 1}
                        </span>
                        <span className="flex-1">{field?.label || key}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {field?.type}
                        </Badge>
                        <button
                          onClick={() => moveField(key, "up")}
                          disabled={idx === 0}
                          className="disabled:opacity-30"
                        >
                          <ChevronUp className="size-4" />
                        </button>
                        <button
                          onClick={() => moveField(key, "down")}
                          disabled={idx === selectedFields.length - 1}
                          className="disabled:opacity-30"
                        >
                          <ChevronDown className="size-4" />
                        </button>
                        <button
                          onClick={() => toggleField(key)}
                          className="text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Filters */}
      {step === 3 && dataSource && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">شروط التقرير</CardTitle>
                <CardDescription>أضف شروط لتصفية البيانات</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addFilter}>
                <Plus /> إضافة شرط
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد شروط - سيتم عرض جميع البيانات
              </p>
            ) : (
              <div className="space-y-3">
                {filters.map((filter, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-end gap-2 rounded-lg border p-3"
                  >
                    <div className="grid gap-1.5">
                      <Label className="text-xs">الحقل</Label>
                      <select
                        value={filter.field}
                        onChange={(e) =>
                          updateFilter(idx, { field: e.target.value })
                        }
                        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      >
                        {availableFields.map((f) => (
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
                          updateFilter(idx, {
                            operator: e.target.value as any,
                          })
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
                        onChange={(e) =>
                          updateFilter(idx, { value: e.target.value })
                        }
                        placeholder="القيمة"
                        className="h-8 w-32"
                      />
                    </div>
                    {filter.operator === "between" && (
                      <div className="grid gap-1.5">
                        <Label className="text-xs">إلى</Label>
                        <Input
                          value={filter.value2 || ""}
                          onChange={(e) =>
                            updateFilter(idx, { value2: e.target.value })
                          }
                          placeholder="القيمة الثانية"
                          className="h-8 w-32"
                        />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      onClick={() => removeFilter(idx)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Sort & Group */}
      {step === 4 && dataSource && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">الترتيب</CardTitle>
                  <CardDescription>
                    ترتيب البيانات حسب حقل معين
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addSort}>
                  <Plus /> إضافة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sortBy.length === 0 ? (
                <p className="text-sm text-muted-foreground">بدون ترتيب</p>
              ) : (
                <div className="space-y-3">
                  {sortBy.map((sort, idx) => (
                    <div
                      key={idx}
                      className="flex items-end gap-2 rounded-lg border p-3"
                    >
                      <div className="grid gap-1.5">
                        <Label className="text-xs">الحقل</Label>
                        <select
                          value={sort.field}
                          onChange={(e) =>
                            updateSort(idx, { field: e.target.value })
                          }
                          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        >
                          {availableFields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">الاتجاه</Label>
                        <select
                          value={sort.direction}
                          onChange={(e) =>
                            updateSort(idx, {
                              direction: e.target.value as "asc" | "desc",
                            })
                          }
                          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        >
                          <option value="asc">تصاعدي</option>
                          <option value="desc">تنازلي</option>
                        </select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => removeSort(idx)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">التجميع والمجاميع</CardTitle>
              <CardDescription>
                تجميع البيانات حسب حقل معين
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>تجميع حسب</Label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">بدون تجميع</option>
                  {availableFields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showTotals}
                  onChange={(e) => setShowTotals(e.target.checked)}
                  className="size-4 rounded border-input accent-primary"
                />
                إظهار المجاميع
              </label>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 5: Chart */}
      {step === 5 && dataSource && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الرسم البياني</CardTitle>
            <CardDescription>
              أضف رسماً بيانياً للتقرير (اختياري)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>نوع الرسم</Label>
              <div className="flex flex-wrap gap-2">
                {CHART_TYPES.map((ct) => {
                  const Icon = ct.icon;
                  return (
                    <Button
                      key={ct.value}
                      variant={chartType === ct.value ? "default" : "outline"}
                      onClick={() => setChartType(ct.value)}
                      className="gap-2"
                    >
                      {Icon && <Icon className="size-4" />}
                      {ct.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {chartType && (
              <>
                <div className="grid gap-2">
                  <Label>حقل X (المحور الأفقي)</Label>
                  <select
                    value={chartType}
                    onChange={() => {}}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">يتم تحديده عند التشغيل</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>حقل Y (المحور الرأسي)</Label>
                  <select
                    value={chartType}
                    onChange={() => {}}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">يتم تحديده عند التشغيل</option>
                  </select>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 6: Save */}
      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">حفظ التقرير</CardTitle>
            <CardDescription>أدخل اسم التقرير واحفظه</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="reportName">اسم التقرير</Label>
              <Input
                id="reportName"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="أدخل اسم التقرير"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reportDescription">الوصف (اختياري)</Label>
              <Input
                id="reportDescription"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="وصف مختصر للتقرير"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              مشاركة التقرير مع المستخدمين الآخرين
            </label>
            <Button
              onClick={handleSave}
              disabled={saving || !reportName.trim()}
            >
              <Save /> {saving ? "جاري الحفظ..." : "حفظ التقرير"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {dataSource && step >= 2 && step <= 5 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">معاينة التقرير</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={runPreview}
                disabled={previewLoading}
              >
                {previewLoading ? "جارٍ التحميل..." : "تشغيل المعاينة"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {previewData ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewData.columns.map((col, i) => (
                      <TableHead key={i}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={previewData.columns.length}
                        className="text-center text-muted-foreground"
                      >
                        لا توجد نتائج
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewData.rows
                      .slice(0, 20)
                      .map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell: any, j: number) => {
                            const fieldDef = availableFields[j];
                            return (
                              <TableCell key={j}>
                                <FieldValue
                                  value={cell}
                                  type={fieldDef?.type || "text"}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                اضغط &quot;تشغيل المعاينة&quot; لعرض النتائج
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ArrowRight /> السابق
        </Button>

        {step < 6 ? (
          <Button
            onClick={() => setStep((s) => Math.min(6, s + 1))}
            disabled={step === 1 && !dataSource}
          >
            التالي <ArrowLeft />
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={saving || !reportName.trim()}
          >
            <Save /> {saving ? "جاري الحفظ..." : "حفظ التقرير"}
          </Button>
        )}
      </div>
    </div>
  );
}
