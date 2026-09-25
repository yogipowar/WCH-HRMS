import type { AppData } from "@/data/mock-data";
import type {
  AttendanceState,
  AttendanceStatus,
  Employee,
  LiveAttendanceStatus,
} from "@/types";

export function getDepartmentName(data: AppData, departmentId: string): string {
  return data.departments.find((item) => item.id === departmentId)?.name ?? "Unassigned";
}

export function getDesignationName(data: AppData, designationId: string): string {
  return data.designations.find((item) => item.id === designationId)?.name ?? "Unassigned";
}

export function getEmployeeName(data: AppData, employeeId: string): string {
  return data.employees.find((item) => item.id === employeeId)?.fullName ?? "Unknown employee";
}

export function getEmployeeByUser(data: AppData, userId: string): Employee | undefined {
  const user = data.users.find((item) => item.id === userId);
  if (user?.employeeId) {
    const linked = data.employees.find((item) => item.id === user.employeeId);
    if (linked) return linked;
  }
  return data.employees.find((item) => item.userId === userId);
}

export function getReportingPersonName(data: AppData, reportingPersonId: string | null): string {
  if (!reportingPersonId) {
    return "Agency Admin";
  }
  return getEmployeeName(data, reportingPersonId);
}

export function toLiveStatus(
  state: AttendanceState,
  attendanceStatus?: AttendanceStatus,
): LiveAttendanceStatus {
  if (state === "WORKING") return "WORKING";
  if (state === "ON_LUNCH_BREAK") return "LUNCH_BREAK";
  if (state === "ON_PERSONAL_BREAK") return "PERSONAL_BREAK";
  if (state === "CLOCKED_OUT") return "COMPLETED";
  if (attendanceStatus === "ON_LEAVE") return "ON_LEAVE";
  if (attendanceStatus === "ABSENT") return "ABSENT";
  if (attendanceStatus === "WEEKLY_OFF") return "WEEKLY_OFF";
  if (attendanceStatus === "HOLIDAY") return "HOLIDAY";
  return "NOT_CLOCKED_IN";
}

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}
