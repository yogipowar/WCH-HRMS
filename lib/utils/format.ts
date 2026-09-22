import { format, parseISO } from "date-fns";
import type {
  AnnouncementStatus,
  AttendanceStatus,
  DocumentType,
  EmploymentType,
  LeaveStatus,
  LeaveType,
  LiveAttendanceStatus,
} from "@/types";

export function formatDate(value: string | Date, pattern = "dd MMM yyyy"): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, pattern);
}

export function formatTime(value: string | Date | null, pattern = "hh:mm a"): string {
  if (!value) {
    return "—";
  }
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, pattern);
}

export function formatDateTime(value: string | Date, pattern = "dd MMM yyyy, hh:mm a"): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, pattern);
}

export function todayIsoDate(now = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function employmentTypeLabel(type: EmploymentType): string {
  switch (type) {
    case "FULL_TIME":
      return "Full-time";
    case "PART_TIME":
      return "Part-time";
    case "CONTRACT":
      return "Contract";
    case "INTERN":
      return "Intern";
  }
}

export function leaveTypeLabel(type: LeaveType): string {
  switch (type) {
    case "CASUAL":
      return "Casual Leave";
    case "SICK":
      return "Sick Leave";
    case "PRIVILEGE":
      return "Privilege Leave";
    case "UNPAID":
      return "Unpaid Leave";
  }
}

export function leaveStatusLabel(status: LeaveStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
  }
}

export function attendanceStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case "PRESENT":
      return "Present";
    case "ABSENT":
      return "Absent";
    case "LATE":
      return "Late";
    case "ON_LEAVE":
      return "On Leave";
    case "INCOMPLETE":
      return "Incomplete";
    case "COMPLETED":
      return "Completed";
    case "WEEKLY_OFF":
      return "Weekly Off";
    case "HOLIDAY":
      return "Holiday";
  }
}

export function liveStatusLabel(status: LiveAttendanceStatus): string {
  switch (status) {
    case "WORKING":
      return "Working";
    case "LUNCH_BREAK":
      return "Lunch Break";
    case "PERSONAL_BREAK":
      return "Personal Break";
    case "COMPLETED":
      return "Completed";
    case "ABSENT":
      return "Absent";
    case "ON_LEAVE":
      return "On Leave";
    case "NOT_CLOCKED_IN":
      return "Not Clocked In";
    case "WEEKLY_OFF":
      return "Weekly Off";
    case "HOLIDAY":
      return "Holiday";
  }
}

export function announcementStatusLabel(status: AnnouncementStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PUBLISHED":
      return "Published";
    case "ARCHIVED":
      return "Archived";
  }
}

export function documentTypeLabel(type: DocumentType): string {
  switch (type) {
    case "OFFER_LETTER":
      return "Offer Letter";
    case "ID_PROOF":
      return "ID Proof";
    case "RESUME":
      return "Resume";
    case "CONTRACT":
      return "Contract";
    case "CERTIFICATE":
      return "Certificate";
    case "OTHER":
      return "Other";
  }
}

export function formatPeriod(period: string): string {
  return format(parseISO(`${period}-01`), "MMM yyyy");
}

export function currency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function daysBetweenInclusive(start: string, end: string): number {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}
