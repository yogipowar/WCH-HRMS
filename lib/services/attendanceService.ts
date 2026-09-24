import { format } from "date-fns";
import {
  computeStoredAttendanceMetrics,
  getActiveBreak,
} from "@/lib/attendance/calculations";
import { getNextState, validateAttendanceAction } from "@/lib/attendance/state-machine";
import { dayKind, weeklyOffReason } from "@/lib/attendance/work-calendar";
import { api } from "@/lib/api/client";
import { createId } from "@/lib/lookups";
import { getData, updateData } from "@/lib/stores/data-store";
import type {
  AttendanceAction,
  AttendanceRecord,
  AttendanceStatus,
  BreakType,
} from "@/types";
import { REQUIRED_DAILY_HOURS } from "@/types";

function todayDate(now = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

function emptyRecord(
  employeeId: string,
  date: string,
  status: AttendanceStatus = "ABSENT",
): AttendanceRecord {
  return {
    id: createId("att"),
    employeeId,
    date,
    clockIn: null,
    clockOut: null,
    state: "NOT_CLOCKED_IN",
    status,
    requiredHours: REQUIRED_DAILY_HOURS,
    activeWorkingMinutes: 0,
    breakMinutes: 0,
    workSession: null,
    breaks: [],
    lateMinutes: 0,
    notes: null,
  };
}

function persistRecord(record: AttendanceRecord): AttendanceRecord {
  const metrics = computeStoredAttendanceMetrics(record);
  return { ...record, ...metrics };
}

function recordForDate(employeeId: string, date: string): AttendanceRecord {
  const data = getData();
  const existing = data.attendanceRecords.find(
    (item) => item.employeeId === employeeId && item.date === date,
  );
  if (existing?.clockIn) {
    return existing;
  }

  const kind = dayKind(date, data.settings, data.holidays);
  if (kind === "WEEKLY_OFF") {
    return existing ? { ...existing, status: "WEEKLY_OFF" } : emptyRecord(employeeId, date, "WEEKLY_OFF");
  }
  if (kind === "HOLIDAY") {
    return existing ? { ...existing, status: "HOLIDAY" } : emptyRecord(employeeId, date, "HOLIDAY");
  }

  return existing ?? emptyRecord(employeeId, date);
}

function applyAction(
  employeeId: string,
  action: AttendanceAction,
  now = new Date(),
): AttendanceRecord {
  const date = todayDate(now);
  const data = getData();
  const kind = dayKind(date, data.settings, data.holidays);
  if (action === "CLOCK_IN" && kind !== "WORKING") {
    const reason =
      kind === "HOLIDAY"
        ? "Today is a company holiday."
        : weeklyOffReason(date, data.settings) ?? "Today is a weekly off.";
    throw new Error(`Clock-in is not available. ${reason}`);
  }

  const current = recordForDate(employeeId, date);

  const validation = validateAttendanceAction(current, action);
  if (!validation.allowed) {
    throw new Error(validation.message);
  }

  const timestamp = now.toISOString();
  let next: AttendanceRecord = { ...current, breaks: [...current.breaks] };

  switch (action) {
    case "CLOCK_IN": {
      const workStart = data.settings.workStartTime;
      const [hours, minutes] = workStart.split(":").map(Number);
      const start = new Date(now);
      start.setHours(hours, minutes, 0, 0);
      const graceEnd = start.getTime() + data.settings.lateAfterMinutes * 60000;
      const lateMinutes =
        now.getTime() > graceEnd
          ? Math.round((now.getTime() - start.getTime()) / 60000)
          : 0;
      next = {
        ...next,
        clockIn: timestamp,
        state: getNextState(action),
        status: lateMinutes > 0 ? "LATE" : "PRESENT",
        lateMinutes: Math.max(0, lateMinutes),
        workSession: { startTime: timestamp, endTime: null },
      };
      break;
    }
    case "CLOCK_OUT": {
      next = persistRecord({
        ...next,
        clockOut: timestamp,
        state: getNextState(action),
        workSession: next.workSession
          ? { ...next.workSession, endTime: timestamp }
          : { startTime: next.clockIn ?? timestamp, endTime: timestamp },
      });
      next.status = next.activeWorkingMinutes >= next.requiredHours * 60 ? "COMPLETED" : "INCOMPLETE";
      break;
    }
    case "START_LUNCH":
    case "START_PERSONAL": {
      const type: BreakType = action === "START_LUNCH" ? "LUNCH" : "PERSONAL";
      next = {
        ...next,
        state: getNextState(action),
        breaks: [
          ...next.breaks,
          {
            id: createId("brk"),
            type,
            startTime: timestamp,
            endTime: null,
            durationMinutes: 0,
          },
        ],
      };
      break;
    }
    case "END_LUNCH":
    case "END_PERSONAL": {
      const type: BreakType = action === "END_LUNCH" ? "LUNCH" : "PERSONAL";
      next = {
        ...next,
        state: getNextState(action),
        breaks: next.breaks.map((item) => {
          if (item.type === type && item.endTime === null) {
            const durationMinutes = Math.max(
              0,
              Math.round((now.getTime() - new Date(item.startTime).getTime()) / 60000),
            );
            return { ...item, endTime: timestamp, durationMinutes };
          }
          return item;
        }),
      };
      break;
    }
  }

  next = persistRecord(next);

  updateData((store) => {
    const exists = store.attendanceRecords.some((item) => item.id === next.id);
    return {
      attendanceRecords: exists
        ? store.attendanceRecords.map((item) => (item.id === next.id ? next : item))
        : [...store.attendanceRecords, next],
    };
  });
  void api.saveAttendance(next);

  return next;
}

export const attendanceService = {
  getAttendance() {
    return getData().attendanceRecords;
  },
  getAttendanceByEmployee(employeeId: string) {
    return getData().attendanceRecords.filter((item) => item.employeeId === employeeId);
  },
  getTodayAttendance(employeeId: string, now = new Date()) {
    return recordForDate(employeeId, todayDate(now));
  },
  getAttendanceById(id: string) {
    return getData().attendanceRecords.find((item) => item.id === id) ?? null;
  },
  clockIn(employeeId: string) {
    return applyAction(employeeId, "CLOCK_IN");
  },
  clockOut(employeeId: string) {
    return applyAction(employeeId, "CLOCK_OUT");
  },
  startBreak(employeeId: string, type: BreakType) {
    return applyAction(employeeId, type === "LUNCH" ? "START_LUNCH" : "START_PERSONAL");
  },
  endBreak(employeeId: string) {
    const record = this.getTodayAttendance(employeeId);
    const active = getActiveBreak(record.breaks);
    if (!active) {
      throw new Error("There is no active break to end.");
    }
    return applyAction(employeeId, active.type === "LUNCH" ? "END_LUNCH" : "END_PERSONAL");
  },
  validate(employeeId: string, action: AttendanceAction) {
    return validateAttendanceAction(this.getTodayAttendance(employeeId), action);
  },
};

export function deriveLiveStatus(record: AttendanceRecord): AttendanceStatus {
  return record.status;
}
