import {
  LATE_MARKS_BEFORE_HALF_DAY,
  LATE_REMOVAL_MONTHLY_LIMIT,
  type AttendanceRecord,
  type LateRemovalRequest,
} from "@/types";

export function monthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

export function isCountableLateMark(
  record: Pick<AttendanceRecord, "id" | "lateMinutes">,
  requests: LateRemovalRequest[],
): boolean {
  if (!(record.lateMinutes > 0)) return false;
  return !requests.some(
    (item) => item.attendanceId === record.id && item.status === "APPROVED",
  );
}

/**
 * Countable late days in the same calendar month as `date`.
 * Pass `onlyBeforeDate` for the half-day rule so later days in the month do not count.
 */
export function countableLateMarksInMonth(
  records: AttendanceRecord[],
  requests: LateRemovalRequest[],
  employeeId: string,
  date: string,
  excludeAttendanceId?: string,
  onlyBeforeDate = false,
): number {
  const month = monthKeyFromDate(date);
  return records.filter((record) => {
    if (record.employeeId !== employeeId) return false;
    if (monthKeyFromDate(record.date) !== month) return false;
    if (onlyBeforeDate && record.date >= date) return false;
    if (excludeAttendanceId && record.id === excludeAttendanceId) return false;
    return isCountableLateMark(record, requests);
  }).length;
}

export function shouldApplyHalfDayForLate(
  priorCountableLatesInMonth: number,
): boolean {
  return priorCountableLatesInMonth >= LATE_MARKS_BEFORE_HALF_DAY;
}

export function lateRemovalRequestsUsedInMonth(
  requests: LateRemovalRequest[],
  employeeId: string,
  date: string,
): number {
  const month = monthKeyFromDate(date);
  return requests.filter(
    (item) =>
      item.employeeId === employeeId &&
      monthKeyFromDate(item.attendanceDate) === month &&
      item.status !== "CANCELLED",
  ).length;
}

export function lateRemovalRemainingInMonth(
  requests: LateRemovalRequest[],
  employeeId: string,
  date: string,
): number {
  return Math.max(0, LATE_REMOVAL_MONTHLY_LIMIT - lateRemovalRequestsUsedInMonth(requests, employeeId, date));
}

export function canRequestLateRemoval(
  record: AttendanceRecord,
  requests: LateRemovalRequest[],
): { allowed: boolean; message: string } {
  if (!record.clockOut) {
    return { allowed: false, message: "Clock out after completing your required hours before requesting." };
  }
  if (!(record.lateMinutes > 0)) {
    return { allowed: false, message: "This day is not marked late." };
  }
  if (record.activeWorkingMinutes < record.requiredHours * 60) {
    return {
      allowed: false,
      message: `Complete ${record.requiredHours}h of active work before requesting late removal.`,
    };
  }
  const existing = requests.find((item) => item.attendanceId === record.id && item.status !== "CANCELLED");
  if (existing) {
    if (existing.status === "PENDING") {
      return { allowed: false, message: "A late removal request is already pending for this day." };
    }
    if (existing.status === "APPROVED") {
      return { allowed: false, message: "Late mark was already removed for this day." };
    }
    return { allowed: false, message: "A late removal request was already submitted for this day." };
  }
  if (lateRemovalRemainingInMonth(requests, record.employeeId, record.date) <= 0) {
    return {
      allowed: false,
      message: `You can request late removal only ${LATE_REMOVAL_MONTHLY_LIMIT} times per month.`,
    };
  }
  return { allowed: true, message: "" };
}
