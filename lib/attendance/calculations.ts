import type {
  AttendanceRecord,
  AttendanceSummary,
  BreakRecord,
  BreakType,
} from "@/types";
import { REQUIRED_DAILY_HOURS } from "@/types";

export function minutesBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0;
  }
  return Math.floor((end - start) / 60000);
}

export function calculateElapsedMinutes(
  clockIn: string | null,
  clockOut: string | null,
  now: Date = new Date(),
): number {
  if (!clockIn) {
    return 0;
  }
  return minutesBetween(clockIn, clockOut ?? now.toISOString());
}

export function calculateBreakMinutes(
  breaks: BreakRecord[],
  now: Date = new Date(),
): number {
  return breaks.reduce((total, record) => {
    if (record.endTime) {
      return total + record.durationMinutes;
    }
    return total + minutesBetween(record.startTime, now.toISOString());
  }, 0);
}

export function calculateBreakMinutesByType(
  breaks: BreakRecord[],
  type: BreakType,
  now: Date = new Date(),
): number {
  return calculateBreakMinutes(
    breaks.filter((record) => record.type === type),
    now,
  );
}

export function calculateActiveWorkingMinutes(
  clockIn: string | null,
  clockOut: string | null,
  breaks: BreakRecord[],
  now: Date = new Date(),
): number {
  const elapsed = calculateElapsedMinutes(clockIn, clockOut, now);
  const breakMinutes = calculateBreakMinutes(breaks, now);
  return Math.max(0, elapsed - breakMinutes);
}

export function calculateRemainingWorkingMinutes(
  activeWorkingMinutes: number,
  requiredHours: number = REQUIRED_DAILY_HOURS,
): number {
  return Math.max(0, requiredHours * 60 - activeWorkingMinutes);
}

export function calculateProgressPercentage(
  activeWorkingMinutes: number,
  requiredHours: number = REQUIRED_DAILY_HOURS,
): number {
  const requiredMinutes = requiredHours * 60;
  if (requiredMinutes <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((activeWorkingMinutes / requiredMinutes) * 100));
}

export function isDailyTargetCompleted(
  activeWorkingMinutes: number,
  requiredHours: number = REQUIRED_DAILY_HOURS,
): boolean {
  return activeWorkingMinutes >= requiredHours * 60;
}

export function calculateOvertime(
  activeWorkingMinutes: number,
  requiredHours: number = REQUIRED_DAILY_HOURS,
): number {
  return Math.max(0, activeWorkingMinutes - requiredHours * 60);
}

export function formatDuration(totalMinutes: number): string {
  const safe = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatDurationCompact(totalMinutes: number): string {
  const safe = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function summarizeAttendance(
  record: Pick<
    AttendanceRecord,
    "clockIn" | "clockOut" | "breaks" | "requiredHours"
  >,
  now: Date = new Date(),
): AttendanceSummary {
  const requiredHours = record.requiredHours || REQUIRED_DAILY_HOURS;
  const elapsedMinutes = calculateElapsedMinutes(record.clockIn, record.clockOut, now);
  const breakMinutes = calculateBreakMinutes(record.breaks, now);
  const lunchMinutes = calculateBreakMinutesByType(record.breaks, "LUNCH", now);
  const personalMinutes = calculateBreakMinutesByType(record.breaks, "PERSONAL", now);
  const activeWorkingMinutes = Math.max(0, elapsedMinutes - breakMinutes);
  const remainingMinutes = calculateRemainingWorkingMinutes(
    activeWorkingMinutes,
    requiredHours,
  );

  return {
    elapsedMinutes,
    breakMinutes,
    lunchMinutes,
    personalMinutes,
    activeWorkingMinutes,
    remainingMinutes,
    requiredMinutes: requiredHours * 60,
    overtimeMinutes: calculateOvertime(activeWorkingMinutes, requiredHours),
    progressPercentage: calculateProgressPercentage(activeWorkingMinutes, requiredHours),
    targetCompleted: isDailyTargetCompleted(activeWorkingMinutes, requiredHours),
  };
}

export function getActiveBreak(breaks: BreakRecord[]): BreakRecord | null {
  return breaks.find((record) => record.endTime === null) ?? null;
}

export function computeStoredAttendanceMetrics(
  record: Pick<AttendanceRecord, "clockIn" | "clockOut" | "breaks" | "requiredHours">,
): Pick<AttendanceRecord, "activeWorkingMinutes" | "breakMinutes"> {
  const summary = summarizeAttendance(record, record.clockOut ? new Date(record.clockOut) : new Date());
  return {
    activeWorkingMinutes: summary.activeWorkingMinutes,
    breakMinutes: summary.breakMinutes,
  };
}
