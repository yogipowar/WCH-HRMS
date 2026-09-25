import type { AttendanceRecord } from "@/types";

export function isOpenAttendance(record: AttendanceRecord | null | undefined): boolean {
  return Boolean(
    record?.clockIn &&
      !record.clockOut &&
      (record.state === "WORKING" ||
        record.state === "ON_LUNCH_BREAK" ||
        record.state === "ON_PERSONAL_BREAK"),
  );
}

export function findOpenAttendance(
  records: AttendanceRecord[],
  employeeId: string,
): AttendanceRecord | undefined {
  return records
    .filter((item) => item.employeeId === employeeId && isOpenAttendance(item))
    .sort((a, b) => (b.clockIn ?? "").localeCompare(a.clockIn ?? ""))[0];
}
