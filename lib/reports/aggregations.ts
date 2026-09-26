import { eachDayOfInterval, endOfWeek, format, parseISO, startOfWeek, subDays, subWeeks } from "date-fns";
import type { AppData } from "@/data/mock-data";
import { summarizeAttendance } from "@/lib/attendance/calculations";
import { findOpenAttendance } from "@/lib/attendance/session";
import { dayKind, isPresentAttendance } from "@/lib/attendance/work-calendar";
import { getDepartmentName } from "@/lib/lookups";
import type { AttendanceRecord } from "@/types";

export function recordsInRange(records: AttendanceRecord[], from: string, to: string) {
  return records.filter((item) => item.date >= from && item.date <= to);
}

export function weeklyTrend(records: AttendanceRecord[], end = new Date()) {
  const days = eachDayOfInterval({ start: subDays(end, 6), end });
  return days.map((day) => {
    const date = format(day, "yyyy-MM-dd");
    const dayRecords = records.filter((item) => item.date === date);
    return {
      label: format(day, "EEE"),
      present: dayRecords.filter((item) => isPresentAttendance(item.status)).length,
      absent: dayRecords.filter((item) => item.status === "ABSENT").length,
    };
  });
}

export function monthlyTrend(records: AttendanceRecord[], end = new Date()) {
  const days = eachDayOfInterval({ start: subDays(end, 29), end });
  return days.map((day) => {
    const date = format(day, "yyyy-MM-dd");
    const dayRecords = records.filter((item) => item.date === date && isPresentAttendance(item.status));
    const avgHours =
      dayRecords.length === 0
        ? 0
        : dayRecords.reduce((sum, item) => sum + item.activeWorkingMinutes, 0) / dayRecords.length / 60;
    return {
      label: format(day, "dd"),
      hours: Number(avgHours.toFixed(1)),
    };
  });
}

export function departmentAttendance(data: AppData, date: string) {
  return data.departments.map((department) => {
    const employeeIds = data.employees
      .filter((item) => item.departmentId === department.id)
      .map((item) => item.id);
    const records = data.attendanceRecords.filter(
      (item) => item.date === date && employeeIds.includes(item.employeeId),
    );
    return {
      name: department.name.replace(" Development", ""),
      present: records.filter((item) => isPresentAttendance(item.status)).length,
      total: employeeIds.length,
    };
  });
}

export function liveAttendanceRows(data: AppData, date: string, now = new Date()) {
  const liveDate = format(now, "yyyy-MM-dd");
  const kind = dayKind(date, data.settings, data.holidays);
  return data.employees
    .filter((item) => item.status === "ACTIVE")
    .map((employee) => {
      const stored = data.attendanceRecords.find(
        (item) => item.employeeId === employee.id && item.date === date,
      );
      const open = date === liveDate ? findOpenAttendance(data.attendanceRecords, employee.id) : undefined;
      const record =
        open ??
        (stored?.clockIn || kind === "WORKING"
          ? stored
          : {
              id: `off-${employee.id}-${date}`,
              employeeId: employee.id,
              date,
              clockIn: null,
              clockOut: null,
              state: "NOT_CLOCKED_IN" as const,
              status: kind === "HOLIDAY" ? ("HOLIDAY" as const) : ("WEEKLY_OFF" as const),
              requiredHours: employee.dailyRequiredHours,
              activeWorkingMinutes: 0,
              breakMinutes: 0,
              workSession: null,
              breaks: [],
              lateMinutes: 0,
              notes: null,
            });
      const summary = record
        ? summarizeAttendance(record, now)
        : summarizeAttendance(
            {
              clockIn: null,
              clockOut: null,
              breaks: [],
              requiredHours: employee.dailyRequiredHours,
            },
            now,
          );
      return {
        employee,
        record,
        summary,
        department: getDepartmentName(data, employee.departmentId),
      };
    });
}

export function employeeDailyHours(records: AttendanceRecord[], employeeId: string, end = new Date(), days = 14) {
  return eachDayOfInterval({ start: subDays(end, days - 1), end }).map((day) => {
    const date = format(day, "yyyy-MM-dd");
    const record = records.find((item) => item.employeeId === employeeId && item.date === date);
    return {
      label: format(day, "dd MMM"),
      hours: record ? Number((record.activeWorkingMinutes / 60).toFixed(1)) : 0,
    };
  });
}

export function employeeWeeklyHours(
  records: AttendanceRecord[],
  employeeId: string,
  requiredHours: number,
  end = new Date(),
  weeks = 5,
) {
  return Array.from({ length: weeks }, (_, index) => {
    const weekEnd = endOfWeek(subWeeks(end, weeks - 1 - index), { weekStartsOn: 1 });
    const weekStart = startOfWeek(weekEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd > end ? end : weekEnd });
    const weekRecords = records.filter(
      (item) => item.employeeId === employeeId && item.date >= format(weekStart, "yyyy-MM-dd") && item.date <= format(weekEnd, "yyyy-MM-dd"),
    );
    const workedHours = weekRecords.reduce((sum, item) => sum + item.activeWorkingMinutes, 0) / 60;
    const scheduledHours = days.length * requiredHours;
    return {
      label: `Week ${index + 1}`,
      scheduled: Number(scheduledHours.toFixed(1)),
      worked: Number(workedHours.toFixed(1)),
      average: days.length ? Number((workedHours / days.length).toFixed(1)) : 0,
    };
  });
}

export function attendanceFlagTrend(records: AttendanceRecord[], end = new Date(), days = 14) {
  return eachDayOfInterval({ start: subDays(end, days - 1), end }).map((day) => {
    const date = format(day, "yyyy-MM-dd");
    const dayRecords = records.filter((item) => item.date === date);
    return {
      label: format(day, "dd MMM"),
      present: dayRecords.filter((item) => isPresentAttendance(item.status)).length,
      late: dayRecords.filter((item) => item.status === "LATE").length,
      leave: dayRecords.filter((item) => item.status === "ON_LEAVE").length,
      absent: dayRecords.filter((item) => item.status === "ABSENT").length,
    };
  });
}

export function dateLabel(value: string) {
  return format(parseISO(value), "dd MMM");
}

export type LiveAttendanceRow = ReturnType<typeof liveAttendanceRows>[number];
