export const USER_ROLES = ["MANAGEMENT", "EMPLOYEE"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERN",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYEE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;
export type Gender = (typeof GENDERS)[number];

export const ATTENDANCE_STATES = [
  "NOT_CLOCKED_IN",
  "WORKING",
  "ON_LUNCH_BREAK",
  "ON_PERSONAL_BREAK",
  "CLOCKED_OUT",
] as const;
export type AttendanceState = (typeof ATTENDANCE_STATES)[number];

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "ON_LEAVE",
  "INCOMPLETE",
  "COMPLETED",
  "WEEKLY_OFF",
  "HOLIDAY",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const LIVE_ATTENDANCE_STATUSES = [
  "WORKING",
  "LUNCH_BREAK",
  "PERSONAL_BREAK",
  "COMPLETED",
  "ABSENT",
  "ON_LEAVE",
  "NOT_CLOCKED_IN",
  "WEEKLY_OFF",
  "HOLIDAY",
] as const;
export type LiveAttendanceStatus = (typeof LIVE_ATTENDANCE_STATUSES)[number];

export const BREAK_TYPES = ["LUNCH", "PERSONAL"] as const;
export type BreakType = (typeof BREAK_TYPES)[number];

export const LEAVE_TYPES = [
  "CASUAL",
  "SICK",
  "EARNED",
  "UNPAID",
  "OTHER",
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const HOLIDAY_TYPES = [
  "PUBLIC",
  "OPTIONAL",
  "COMPANY",
  "RELIGIOUS",
] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];

export const ANNOUNCEMENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const ANNOUNCEMENT_AUDIENCES = [
  "ALL",
  "MANAGEMENT",
  "EMPLOYEE",
  "DEPARTMENT",
] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const DOCUMENT_TYPES = [
  "OFFER_LETTER",
  "ID_PROOF",
  "RESUME",
  "CONTRACT",
  "CERTIFICATE",
  "OTHER",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ["ACTIVE", "EXPIRED", "PENDING"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "LEAVE_PENDING",
  "ATTENDANCE_REMINDER",
  "LATE_ARRIVAL",
  "HOLIDAY",
  "ANNOUNCEMENT",
  "PROFILE_UPDATE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const SATURDAY_WEEKS = [1, 2, 3, 4, 5] as const;
export type SaturdayWeek = (typeof SATURDAY_WEEKS)[number];
export const DEFAULT_SATURDAY_OFF_WEEKS: SaturdayWeek[] = [1, 3, 5];
export const CORE_WORK_DAYS: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  employeeId: string | null;
  avatarUrl: string | null;
  username: string;
  password: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface BankInformation {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  personalEmail: string;
  workEmail: string;
  address: string;
  departmentId: string;
  designationId: string;
  joiningDate: string;
  employmentType: EmploymentType;
  reportingPersonId: string | null;
  workLocation: string;
  status: EmployeeStatus;
  dailyRequiredHours: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  emergencyContact: EmergencyContact;
  bankInformation: BankInformation;
}

export interface Department {
  id: string;
  name: string;
  headEmployeeId: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  description: string;
}

export interface Designation {
  id: string;
  name: string;
  departmentId: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface WorkSession {
  startTime: string;
  endTime: string | null;
}

export interface BreakRecord {
  id: string;
  type: BreakType;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  state: AttendanceState;
  status: AttendanceStatus;
  requiredHours: number;
  activeWorkingMinutes: number;
  breakMinutes: number;
  workSession: WorkSession | null;
  breaks: BreakRecord[];
  lateMinutes: number;
  notes: string | null;
}

export interface LeaveBalance {
  employeeId: string;
  casual: number;
  sick: number;
  earned: number;
  unpaid: number;
  other: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  reason: string;
  attachmentName: string | null;
  status: LeaveStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: HolidayType;
  description: string;
  recurring: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  href: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  audience: AnnouncementAudience;
  departmentId: string | null;
  publishDate: string;
  status: AnnouncementStatus;
  createdBy: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: DocumentType;
  name: string;
  fileName: string;
  expiryDate: string | null;
  status: DocumentStatus;
  uploadedAt: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  period: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  status: "DRAFT" | "PROCESSED" | "PAID";
  payslipAvailable: boolean;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  defaultDailyHours: number;
  workStartTime: string;
  lateAfterMinutes: number;
  workDays: Weekday[];
  sundayOff: boolean;
  saturdayOffWeeks: SaturdayWeek[];
  breakTypes: BreakType[];
}

export interface AttendanceSummary {
  elapsedMinutes: number;
  breakMinutes: number;
  lunchMinutes: number;
  personalMinutes: number;
  activeWorkingMinutes: number;
  remainingMinutes: number;
  requiredMinutes: number;
  overtimeMinutes: number;
  progressPercentage: number;
  targetCompleted: boolean;
}

export interface AttendanceActionResult {
  allowed: boolean;
  message: string;
}

export type AttendanceAction =
  | "CLOCK_IN"
  | "CLOCK_OUT"
  | "START_LUNCH"
  | "END_LUNCH"
  | "START_PERSONAL"
  | "END_PERSONAL";

export interface SearchResult {
  id: string;
  type: "employee" | "department" | "leave" | "attendance" | "announcement" | "holiday" | "document";
  title: string;
  subtitle: string;
  href: string;
}

export interface DateRangeValue {
  from: Date | undefined;
  to: Date | undefined;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "attendance" | "leave" | "employee" | "announcement";
}

export const REQUIRED_DAILY_HOURS = 9;
export const DEFAULT_WORK_START = "09:30";
