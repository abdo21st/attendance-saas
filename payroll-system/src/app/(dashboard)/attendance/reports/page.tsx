"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { CalendarDays, Download, FileText, Users, Clock, Moon, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceRate: number;
  nightShiftsThisMonth: number;
}

interface DailyRecord {
  id: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  lateMinutes: number;
  nightShift: boolean;
}

const CHART_COLORS = ["#22c55e", "#ef4444", "#eab308"];

export default function AttendanceReportsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, recordsRes] = await Promise.all([
        fetch(`/api/attendance/reports?date=${date}`),
        fetch(`/api/attendance/daily?date=${date}`),
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        setRecords(recordsData.records || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/attendance/export?date=${date}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const lateCount = records.filter((r) => r.status === "late" || r.lateMinutes > 0).length;

  const chartData = [
    { name: "حاضر", value: presentCount, fill: "#22c55e" },
    { name: "غائب", value: absentCount, fill: "#ef4444" },
    { name: "متأخر", value: lateCount, fill: "#eab308" },
  ].filter((d) => d.value > 0);

  const nightRecords = records.filter((r) => r.nightShift);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">تقارير الحضور</h1>
          <p className="text-sm text-muted-foreground">إحصائيات وتقارير يومية للحضور والانصراف</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="size-4" />
          تصدير Excel
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Label>التاريخ</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">إجمالي الموظفين</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalEmployees || records.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Clock className="size-4 text-green-500" />
            <CardTitle className="text-sm font-medium">الحضور اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{stats?.presentToday ?? presentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <CardTitle className="text-sm font-medium">الغياب</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{stats?.absentToday ?? absentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Moon className="size-4 text-blue-500" />
            <CardTitle className="text-sm font-medium">ورديات ليلية</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">{stats?.nightShiftsThisMonth ?? nightRecords.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>سجل الحضور اليومي</CardTitle>
            <CardDescription>{date}</CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-auto">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground py-8">جارٍ التحميل...</p>
            ) : records.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">لا توجد سجلات لهذا اليوم</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الحضور</TableHead>
                    <TableHead>الانصراف</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تأخير</TableHead>
                    <TableHead>ليلي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell dir="ltr" className="font-medium">{r.employeeCode}</TableCell>
                      <TableCell>{r.employeeName}</TableCell>
                      <TableCell>{r.checkIn || "—"}</TableCell>
                      <TableCell>{r.checkOut || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "present" ? "default" : r.status === "late" ? "secondary" : "destructive"}>
                          {r.status === "present" ? "حاضر" : r.status === "late" ? "متأخر" : r.status === "absent" ? "غائب" : r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.lateMinutes > 0 ? `${r.lateMinutes} د` : "—"}</TableCell>
                      <TableCell>{r.nightShift ? <Badge variant="outline">نعم</Badge> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>نسبة الحضور</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, percent }: any) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">لا توجد بيانات</p>
              )}
            </CardContent>
          </Card>

          {nightRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="size-4 text-blue-500" />
                  تقرير الورديات الليلية
                </CardTitle>
                <CardDescription>{nightRecords.length} موظف</CardDescription>
              </CardHeader>
              <CardContent className="max-h-48 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>الحضور</TableHead>
                      <TableHead>الانصراف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nightRecords.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.employeeName}</TableCell>
                        <TableCell>{r.checkIn}</TableCell>
                        <TableCell>{r.checkOut}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
