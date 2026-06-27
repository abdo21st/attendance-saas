import * as XLSX from "xlsx";

export interface ParsedRecord {
  employeeCode: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

function normalizeCode(code: string): string {
  return code.trim().replace(/^0+/, "") || code.trim();
}

function parseTime(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");
  const patterns = [
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i,
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  ];
  for (const pat of patterns) {
    const m = cleaned.match(pat);
    if (m) {
      let [, h, min, sec, ampm] = m;
      let hh = parseInt(h, 10);
      if (ampm) {
        if (ampm.toUpperCase() === "PM" && hh !== 12) hh += 12;
        if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
      }
      return `${String(hh).padStart(2, "0")}:${min.padStart(2, "0")}:${(sec || "00").padStart(2, "0")}`;
    }
  }
  return cleaned;
}

function parseDate(value: string, fmt: "DD/MM/YYYY" | "YYYY-MM-DD" = "DD/MM/YYYY"): string {
  const cleaned = value.trim();
  if (fmt === "YYYY-MM-DD") {
    const m = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const m = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) {
    let [, a, b, y] = m;
    if (fmt === "DD/MM/YYYY") return `${a.padStart(2, "0")}/${b.padStart(2, "0")}/${y}`;
    return `${b.padStart(2, "0")}/${a.padStart(2, "0")}/${y}`;
  }
  return cleaned;
}

function normalizeStatus(s: string): string {
  const v = s.trim().toLowerCase();
  if (/حاضر|present|check\s*in/i.test(v)) return "present";
  if (/غائب|absent/i.test(v)) return "absent";
  if (/متأخر|late/i.test(v)) return "late";
  if (/إجازة|leave|vacation/i.test(v)) return "leave";
  return v;
}

function findColIndex(row: string[], keywords: string[]): number {
  const lower = row.map((c) => c.toLowerCase().replace(/[\s_-]/g, ""));
  for (const kw of keywords) {
    const idx = lower.indexOf(kw.toLowerCase().replace(/[\s_-]/g, ""));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseZKTecoCSV(content: string): ParsedRecord[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const hdrLower = header.map((h) => h.toLowerCase().replace(/[\s_-]/g, ""));

  const empIdx = findColIndex(header, ["employeecode", "employee code", "employee_code", "empcode", "emp_code", "userid", "user id", "user_id", "code"]);
  const dateIdx = findColIndex(header, ["date", "attdate", "att_date", "attendance_date", "workdate"]);
  const timeIdx = findColIndex(header, ["time", "datetime", "date_time", "att time", "att_time", "clocking"]);
  const statusIdx = findColIndex(header, ["status", "state", "attendance_state"]);
  const verifyIdx = findColIndex(header, ["verify", "verifymode", "verify_mode", "mode"]);

  const records: ParsedRecord[] = [];
  const raw: Record<string, { date: string; checkIn: string; checkOut: string }> = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const empCode = normalizeCode(empIdx >= 0 ? cols[empIdx] || "" : cols[0] || "");
    if (!empCode) continue;

    let dateStr = dateIdx >= 0 ? parseDate(cols[dateIdx] || "") : "";
    let timeStr = timeIdx >= 0 ? parseTime(cols[timeIdx] || "") : "";

    if (timeIdx >= 0 && dateIdx === -1 && timeStr.includes("/")) {
      const parts = timeStr.split(" ");
      if (parts.length >= 2) {
        dateStr = parseDate(parts[0]);
        timeStr = parseTime(parts.slice(1).join(" "));
      }
    }

    let status = statusIdx >= 0 ? normalizeStatus(cols[statusIdx] || "") : "present";
    const key = `${empCode}_${dateStr}`;

    if (!raw[key]) {
      raw[key] = { date: dateStr, checkIn: timeStr, checkOut: "" };
    } else {
      const existing = raw[key];
      if (!existing.checkIn || timeStr <= existing.checkIn) {
        raw[key] = { date: dateStr, checkIn: timeStr, checkOut: existing.checkIn || "" };
      } else if (timeStr > existing.checkIn) {
        existing.checkOut = timeStr;
      }
    }

    if (statusIdx === -1 && verifyIdx >= 0) {
      const v = (cols[verifyIdx] || "").toLowerCase();
      if (v.includes("in") || v.includes("entry")) status = "present";
    }
  }

  for (const [key, val] of Object.entries(raw)) {
    records.push({
      employeeCode: key.split("_")[0],
      date: val.date,
      checkIn: val.checkIn,
      checkOut: val.checkOut,
      status: val.checkIn ? "present" : "absent",
    });
  }

  return records;
}

export function parseHikvisionCSV(content: string): ParsedRecord[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

  const empIdx = findColIndex(header, ["employeeid", "employee_id", "employee id", "employeeno", "employee_no", "empcode", "code", "personid", "person_id"]);
  const dateIdx = findColIndex(header, ["date", "attendance date", "attendance_date", "workdate", "work_date"]);
  const timeIdx = findColIndex(header, ["time", "datetime", "date_time", "att time", "att_time", "access time", "access_time"]);
  const directionIdx = findColIndex(header, ["direction", "type", "event", "event_type", "in/out", "in_out", "status"]);

  if (empIdx === -1 || (dateIdx === -1 && timeIdx === -1)) return [];

  const raw: Record<string, { date: string; checkIn: string; checkOut: string }> = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const empCode = normalizeCode(cols[empIdx] || "");
    if (!empCode) continue;

    let dateStr = dateIdx >= 0 ? parseDate(cols[dateIdx] || "") : "";
    let timeStr = timeIdx >= 0 ? parseTime(cols[timeIdx] || "") : "";

    const direction = directionIdx >= 0 ? cols[directionIdx]?.toLowerCase().trim() : "";
    const isIn = /in|check.?in|entry|enter|دخول/i.test(direction);
    const isOut = /out|check.?out|exit|خروج/i.test(direction);

    const key = `${empCode}_${dateStr}`;
    if (!raw[key]) raw[key] = { date: dateStr, checkIn: "", checkOut: "" };
    if (isIn || (!isOut && !raw[key].checkIn)) {
      if (!raw[key].checkIn || timeStr < raw[key].checkIn) raw[key].checkIn = timeStr;
    } else if (isOut || (!isIn && timeStr > (raw[key].checkIn || ""))) {
      if (timeStr > raw[key].checkIn) raw[key].checkOut = timeStr;
    }
  }

  return Object.entries(raw).map(([key, val]) => ({
    employeeCode: key.split("_")[0],
    date: val.date,
    checkIn: val.checkIn,
    checkOut: val.checkOut,
    status: val.checkIn ? "present" : "absent",
  }));
}

export function parseExcel(buffer: ArrayBuffer): ParsedRecord[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][];
  if (rows.length < 2) return [];
  const header = rows[0].map((c) => String(c).trim());
  const textContent = header.join(",") + "\n" + rows.slice(1).map((r) => r.join(",")).join("\n");
  const fmt = autoDetectFormat(header.join(","));
  if (fmt === "zkteco") return parseZKTecoCSV(textContent);
  return parseHikvisionCSV(textContent);
}

export function autoDetectFormat(content: string): "zkteco" | "hikvision" | "unknown" {
  const lower = content.toLowerCase();
  const zkKeywords = ["userid", "user id", "user_id", "zkteco", "zk", "biometric", "empcode", "emp_code"];
  const hikKeywords = ["employeeid", "employee_id", "personid", "person_id", "hikvision", "hik", "direction", "event_type", "in/out"];
  let zkScore = 0;
  let hikScore = 0;
  for (const kw of zkKeywords) {
    if (lower.includes(kw)) zkScore += 2;
  }
  for (const kw of hikKeywords) {
    if (lower.includes(kw)) hikScore += 2;
  }
  if (zkScore > hikScore) return "zkteco";
  if (hikScore > zkScore) return "hikvision";
  return "unknown";
}
