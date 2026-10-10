import { countableLateMarksInMonth, shouldApplyHalfDayForLate } from "@/lib/attendance/late-policy";
import { minutesBetween, summarizeAttendance } from "@/lib/attendance/calculations";
import type { AttendanceRecord, AttendanceStatus, BreakRecord, BreakType, LateRemovalRequest } from "@/types";

/** Inclusive last day admins may correct clock and break times. */
export const ADMIN_ATTENDANCE_EDIT_UNTIL = "2026-10-30";

const OFFICE_OFFSET_MINUTES = 5 * 60 + 30;

export type AdminBreakInput = {
  id: string;
  type: BreakType;
  start: string;
  end: string;
};

export type AdminTimeInput = {
  clockIn: string;
  clockOut: string;
  breaks: AdminBreakInput[];
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function officeToday(now = new Date()): string {
  const shifted = new Date(now.getTime() + OFFICE_OFFSET_MINUTES * 60_000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function adminAttendanceEditOpen(now = new Date()): boolean {
  return officeToday(now) <= ADMIN_ATTENDANCE_EDIT_UNTIL;
}

/** Wall-clock time in the Kolhapur office zone, stored as an absolute instant. */
export function officeDateTime(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const utc = Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - OFFICE_OFFSET_MINUTES * 60_000;
  return new Date(utc).toISOString();
}

export function officeTimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() + OFFICE_OFFSET_MINUTES * 60_000);
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function validTime(value: string): boolean {
  return value === "" || TIME_PATTERN.test(value);
}

export function applyAdminAttendanceTimes(options: {
  record: AttendanceRecord;
  input: AdminTimeInput;
  workStartTime: string;
  lateAfterMinutes: number;
  monthRecords: AttendanceRecord[];
  lateRemovals: LateRemovalRequest[];
  now?: Date;
}): { record: AttendanceRecord } | { error: string } {
  const now = options.now ?? new Date();
  if (!adminAttendanceEditOpen(now)) {
    return { error: "Attendance time corrections ended on 30 Oct 2026." };
  }

  const { record, input } = options;
  const clockIn = input.clockIn.trim();
  const clockOut = input.clockOut.trim();
  const breaks = input.breaks ?? [];

  if (!validTime(clockIn) || !validTime(clockOut)) {
    return { error: "Enter clock times as HH:mm." };
  }
  if (breaks.length > 12) {
    return { error: "A day can have at most 12 breaks." };
  }
  for (const item of breaks) {
    if (item.type !== "LUNCH" && item.type !== "PERSONAL") {
      return { error: "Breaks can only be lunch or personal." };
    }
    if (!validTime(item.start) || !validTime(item.end)) {
      return { error: "Enter break times as HH:mm." };
    }
    if (!item.start) {
      return { error: "Each break needs a start time." };
    }
  }
  if (!clockIn && (clockOut || breaks.length > 0)) {
    return { error: "Set a clock-in time before clock-out or breaks." };
  }
  if (clockOut && clockIn && clockOut < clockIn) {
    return { error: "Clock-out must be after clock-in." };
  }

  const openBreaks = breaks.filter((item) => !item.end);
  if (clockOut && openBreaks.length > 0) {
    return { error: "Close every break before setting a clock-out time." };
  }
  if (openBreaks.length > 1) {
    return { error: "Only one break can be open at a time." };
  }

  const spans = breaks.map((item) => ({
    ...item,
    startAt: item.start,
    endAt: item.end || clockOut || "23:59",
  }));
  for (const item of spans) {
    if (item.start < clockIn) {
      return { error: "A break cannot start before clock-in." };
    }
    if (item.end && item.end < item.start) {
      return { error: "A break must end after it starts." };
    }
    if (clockOut && item.end && item.end > clockOut) {
      return { error: "A break must end by clock-out." };
    }
  }
  const ordered = [...spans].sort((a, b) => a.startAt.localeCompare(b.startAt));
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].startAt < ordered[index - 1].endAt) {
      return { error: "Breaks cannot overlap." };
    }
  }

  if (!clockIn) {
    const kept: AttendanceStatus[] = ["ON_LEAVE", "WEEKLY_OFF", "HOLIDAY"];
    const status = kept.includes(record.status) ? record.status : "ABSENT";
    return {
      record: {
        ...record,
        clockIn: null,
        clockOut: null,
        state: "NOT_CLOCKED_IN",
        status,
        activeWorkingMinutes: 0,
        breakMinutes: 0,
        workSession: null,
        breaks: [],
        lateMinutes: 0,
      },
    };
  }

  const clockInIso = officeDateTime(record.date, clockIn);
  const clockOutIso = clockOut ? officeDateTime(record.date, clockOut) : null;
  const nextBreaks: BreakRecord[] = ordered.map((item) => {
    const startTime = officeDateTime(record.date, item.start);
    const endTime = item.end ? officeDateTime(record.date, item.end) : null;
    return {
      id: item.id,
      type: item.type,
      startTime,
      endTime,
      durationMinutes: endTime ? minutesBetween(startTime, endTime) : 0,
    };
  });

  const openBreak = nextBreaks.find((item) => !item.endTime);
  const state = clockOutIso
    ? "CLOCKED_OUT"
    : openBreak?.type === "LUNCH"
      ? "ON_LUNCH_BREAK"
      : openBreak?.type === "PERSONAL"
        ? "ON_PERSONAL_BREAK"
        : "WORKING";

  const clockInUnchanged = officeTimeValue(record.clockIn) === clockIn;
  const scheduled = officeDateTime(record.date, options.workStartTime || "09:30");
  const graceMs = Math.max(0, options.lateAfterMinutes) * 60_000;
  const arrived = new Date(clockInIso).getTime();
  const lateMinutes = clockInUnchanged
    ? record.lateMinutes
    : arrived > new Date(scheduled).getTime() + graceMs
      ? minutesBetween(scheduled, clockInIso)
      : 0;

  const anchor = clockOutIso
    ? new Date(clockOutIso)
    : record.date === officeToday(now)
      ? now
      : new Date(officeDateTime(record.date, "23:59"));

  const draft: AttendanceRecord = {
    ...record,
    clockIn: clockInIso,
    clockOut: clockOutIso,
    state,
    workSession: { startTime: clockInIso, endTime: clockOutIso },
    breaks: nextBreaks,
    lateMinutes,
  };
  const summary = summarizeAttendance(draft, anchor);
  const active = summary.activeWorkingMinutes;
  const required = record.requiredHours * 60;

  let status: AttendanceStatus;
  if (!clockOutIso) {
    status = lateMinutes > 0 ? "LATE" : "PRESENT";
  } else if (active < required) {
    status = "INCOMPLETE";
  } else if (lateMinutes > 0) {
    const prior = countableLateMarksInMonth(
      options.monthRecords,
      options.lateRemovals,
      record.employeeId,
      record.date,
      record.id,
    );
    status = shouldApplyHalfDayForLate(prior) ? "HALF_DAY" : "LATE";
  } else {
    status = "COMPLETED";
  }

  return {
    record: {
      ...draft,
      status,
      activeWorkingMinutes: active,
      breakMinutes: summary.breakMinutes,
    },
  };
}
