export interface ShiftBreakdown {
  regular: number;
  evening: number;
  night: number;
  total: number;
}

export function calculateShiftHours(checkIn: Date, checkOut: Date): ShiftBreakdown {
  const MS_IN_HOUR = 1000 * 60 * 60;
  const totalHours = Math.max(0, (checkOut.getTime() - checkIn.getTime()) / MS_IN_HOUR);
  if (totalHours === 0) return { regular: 0, evening: 0, night: 0, total: 0 };

  let regular = 0;
  let evening = 0;
  let night = 0;

  const inMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
  let outMinutes = checkOut.getHours() * 60 + checkOut.getMinutes();

  const isNextDay = outMinutes < inMinutes && totalHours > 1;
  if (isNextDay) outMinutes += 24 * 60;

  const REGULAR_START = 6 * 60;
  const REGULAR_END = 18 * 60;
  const EVENING_START = 18 * 60;
  const EVENING_END = 22 * 60;
  const NIGHT_START = 22 * 60;
  const NIGHT_END = 6 * 60 + 24 * 60;

  function intersect(a1: number, a2: number, b1: number, b2: number): number {
    const start = Math.max(a1, b1);
    const end = Math.min(a2, b2);
    return Math.max(0, end - start);
  }

  if (!isNextDay) {
    regular = intersect(inMinutes, outMinutes, REGULAR_START, REGULAR_END);
    evening = intersect(inMinutes, outMinutes, EVENING_START, EVENING_END);
    night = intersect(inMinutes, outMinutes, NIGHT_START, NIGHT_END);
  } else {
    const inToMidnight = 24 * 60;
    const midnightToOut = outMinutes;

    regular = intersect(inMinutes, inToMidnight, REGULAR_START, REGULAR_END) +
      intersect(0, midnightToOut, REGULAR_START, REGULAR_END);

    evening = intersect(inMinutes, inToMidnight, EVENING_START, EVENING_END) +
      intersect(0, midnightToOut, EVENING_START, EVENING_END);

    night = intersect(inMinutes, inToMidnight, NIGHT_START, NIGHT_END) +
      intersect(0, midnightToOut, NIGHT_START, NIGHT_END);
  }

  regular = Math.round((regular / 60) * 100) / 100;
  evening = Math.round((evening / 60) * 100) / 100;
  night = Math.round((night / 60) * 100) / 100;

  return { regular, evening, night, total: Math.round(totalHours * 100) / 100 };
}

export function isNightShift(checkIn: Date, checkOut: Date): boolean {
  const { night } = calculateShiftHours(checkIn, checkOut);
  return night > 0;
}

export function formatShiftSummary(hours: ShiftBreakdown): string {
  const parts: string[] = [];
  if (hours.regular > 0) parts.push(`عادي ${hours.regular.toFixed(2)}س`);
  if (hours.evening > 0) parts.push(`مسائي ${hours.evening.toFixed(2)}س (×1.25)`);
  if (hours.night > 0) parts.push(`ليلي ${hours.night.toFixed(2)}س (×1.50)`);
  return parts.join(" | ") || "—";
}

export function getEffectiveHours(hours: ShiftBreakdown, eveningFactor = 1.25, nightFactor = 1.5): number {
  return Math.round((hours.regular + hours.evening * eveningFactor + hours.night * nightFactor) * 100) / 100;
}
