import { eachDayOfInterval, endOfMonth, format, getDay, parseISO, startOfMonth } from "date-fns";
import type { AttendanceStatus, CompanySettings, Holiday, SaturdayWeek, Weekday } from "@/types";
import { DEFAULT_SATURDAY_OFF_WEEKS } from "@/types";

const JS_DAY_TO_WEEKDAY: Weekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const SATURDAY_WEEK_LABEL: Record<SaturdayWeek, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
};

const NON_PRESENT_STATUSES: AttendanceStatus[] = ["ABSENT", "ON_LEAVE", "WEEKLY_OFF", "HOLIDAY"];

export type DayKind = "WORKING" | "WEEKLY_OFF" | "HOLIDAY";

export interface WorkPolicy {
  workDays: Weekday[];
  sundayOff: boolean;
  saturdayOffWeeks: SaturdayWeek[];
}

export function toIsoDate(value: Date | string): string {
  return typeof value === "string" ? value.slice(0, 10) : format(value, "yyyy-MM-dd");
}

export function toCalendarDate(value: Date | string): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

export function saturdayWeekOfMonth(value: Date | string): SaturdayWeek {
  const day = toCalendarDate(value).getDate();
  return Math.ceil(day / 7) as SaturdayWeek;
}

export function resolveWorkPolicy(settings: Partial<CompanySettings> | CompanySettings): WorkPolicy {
  return {
    workDays: settings.workDays ?? ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
    sundayOff: settings.sundayOff ?? true,
    saturdayOffWeeks: settings.saturdayOffWeeks ?? DEFAULT_SATURDAY_OFF_WEEKS,
  };
}

export function weeklyOffReason(value: Date | string, settings: Partial<CompanySettings> | CompanySettings): string | null {
  const date = toCalendarDate(value);
  const policy = resolveWorkPolicy(settings);
  const weekday = getDay(date);

  if (weekday === 0 && policy.sundayOff) {
    return "Sunday weekly off";
  }

  if (weekday === 6 && policy.saturdayOffWeeks.includes(saturdayWeekOfMonth(date))) {
    return `${SATURDAY_WEEK_LABEL[saturdayWeekOfMonth(date)]} Saturday weekly off`;
  }

  const name = JS_DAY_TO_WEEKDAY[weekday];
  if (!policy.workDays.includes(name)) {
    return `${name.charAt(0)}${name.slice(1).toLowerCase()} weekly off`;
  }

  return null;
}

export function isWeeklyOff(value: Date | string, settings: Partial<CompanySettings> | CompanySettings): boolean {
  return weeklyOffReason(value, settings) !== null;
}

export function isCompanyHoliday(value: Date | string, holidays: Holiday[]): boolean {
  const date = toIsoDate(value);
  return holidays.some((item) => item.date === date);
}

export function dayKind(
  value: Date | string,
  settings: Partial<CompanySettings> | CompanySettings,
  holidays: Holiday[],
): DayKind {
  if (isCompanyHoliday(value, holidays)) return "HOLIDAY";
  if (isWeeklyOff(value, settings)) return "WEEKLY_OFF";
  return "WORKING";
}

export function isWorkingDay(
  value: Date | string,
  settings: Partial<CompanySettings> | CompanySettings,
  holidays: Holiday[],
): boolean {
  return dayKind(value, settings, holidays) === "WORKING";
}

export function weeklyOffsInMonth(month: Date, settings: Partial<CompanySettings> | CompanySettings) {
  return eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
    .map((date) => {
      const reason = weeklyOffReason(date, settings);
      return reason ? { date: format(date, "yyyy-MM-dd"), label: reason } : null;
    })
    .filter((item): item is { date: string; label: string } => item !== null);
}

export function workWeekPolicyLabel(settings: Partial<CompanySettings> | CompanySettings): string {
  const policy = resolveWorkPolicy(settings);
  const saturday = policy.saturdayOffWeeks.map((week) => SATURDAY_WEEK_LABEL[week]).join(", ");
  const parts: string[] = [];
  if (saturday) {
    parts.push(`${saturday} Saturday${policy.saturdayOffWeeks.length === 1 ? "" : "s"}`);
  }
  if (policy.sundayOff) {
    parts.push("every Sunday");
  }
  return parts.length > 0 ? `${parts.join(" and ")} off` : "No weekly offs configured";
}

export function saturdayWeekLabel(week: SaturdayWeek): string {
  return `${SATURDAY_WEEK_LABEL[week]} Saturday`;
}

export function isPresentAttendance(status: AttendanceStatus): boolean {
  return !NON_PRESENT_STATUSES.includes(status);
}
