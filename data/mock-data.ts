import { addDays, format, parseISO, subDays } from "date-fns";
import { computeStoredAttendanceMetrics } from "@/lib/attendance/calculations";
import { isWorkingDay } from "@/lib/attendance/work-calendar";
import type {
  Announcement,
  AttendanceRecord,
  AttendanceState,
  AttendanceStatus,
  BreakRecord,
  CompanySettings,
  Department,
  Designation,
  Employee,
  EmployeeDocument,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  Notification,
  PayrollRecord,
  User,
} from "@/types";
import { REQUIRED_DAILY_HOURS } from "@/types";
import { AGENCY } from "@/lib/constants";
import { remainingFromApproved } from "@/lib/leave/policy";
import { buildPayrollHistory } from "@/lib/payroll/record";

export interface AppData {
  users: User[];
  employees: Employee[];
  departments: Department[];
  designations: Designation[];
  attendanceRecords: AttendanceRecord[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  holidays: Holiday[];
  notifications: Notification[];
  announcements: Announcement[];
  documents: EmployeeDocument[];
  payrollRecords: PayrollRecord[];
  settings: CompanySettings;
}

function at(date: string, time: string): string {
  return `${date}T${time}:00+05:30`;
}

function breakRecord(
  id: string,
  type: BreakRecord["type"],
  start: string,
  end: string | null,
): BreakRecord {
  const durationMinutes = end
    ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
    : 0;
  return { id, type, startTime: start, endTime: end, durationMinutes };
}

function attendance(
  partial: Omit<AttendanceRecord, "activeWorkingMinutes" | "breakMinutes"> &
    Partial<Pick<AttendanceRecord, "activeWorkingMinutes" | "breakMinutes">>,
): AttendanceRecord {
  const metrics = computeStoredAttendanceMetrics(partial);
  return {
    ...partial,
    activeWorkingMinutes: metrics.activeWorkingMinutes,
    breakMinutes: metrics.breakMinutes,
  };
}

export const TODAY = "2026-09-22";

export const settings: CompanySettings = {
  companyName: AGENCY.name,
  tagline: AGENCY.tagline,
  email: AGENCY.email,
  phone: AGENCY.phone,
  address: AGENCY.address,
  website: AGENCY.website,
  defaultDailyHours: REQUIRED_DAILY_HOURS,
  workStartTime: "09:30",
  lateAfterMinutes: 10,
  workDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
  sundayOff: true,
  saturdayOffWeeks: [1, 3, 5],
  breakTypes: ["LUNCH", "PERSONAL"],
};

export const departments: Department[] = [
  { id: "dept-frontend", name: "Frontend Development", headEmployeeId: "emp-001", status: "ACTIVE", createdAt: "2024-01-12", description: "Web interfaces and client-side applications." },
  { id: "dept-backend", name: "Backend Development", headEmployeeId: "emp-002", status: "ACTIVE", createdAt: "2024-01-12", description: "APIs, services, and system architecture." },
  { id: "dept-mobile", name: "Mobile Development", headEmployeeId: "emp-007", status: "ACTIVE", createdAt: "2024-03-04", description: "iOS and Android product delivery." },
  { id: "dept-design", name: "UI/UX Design", headEmployeeId: "emp-004", status: "ACTIVE", createdAt: "2024-01-20", description: "Product design and design systems." },
  { id: "dept-qa", name: "Quality Assurance", headEmployeeId: "emp-005", status: "ACTIVE", createdAt: "2024-02-08", description: "Quality, testing, and release readiness." },
  { id: "dept-hr", name: "Human Resources", headEmployeeId: null, status: "ACTIVE", createdAt: "2024-01-08", description: "People operations and workplace policies." },
  { id: "dept-bd", name: "Business Development", headEmployeeId: "emp-008", status: "ACTIVE", createdAt: "2024-04-15", description: "Client acquisition and partnerships." },
  { id: "dept-admin", name: "Administration", headEmployeeId: null, status: "ACTIVE", createdAt: "2024-01-08", description: "Company administration and operations." },
];

export const designations: Designation[] = [
  { id: "des-frontend", name: "Frontend Developer", departmentId: "dept-frontend", status: "ACTIVE" },
  { id: "des-react", name: "React Developer", departmentId: "dept-frontend", status: "ACTIVE" },
  { id: "des-backend", name: "Backend Developer", departmentId: "dept-backend", status: "ACTIVE" },
  { id: "des-fullstack", name: "Full Stack Developer", departmentId: "dept-backend", status: "ACTIVE" },
  { id: "des-mobile", name: "Mobile Developer", departmentId: "dept-mobile", status: "ACTIVE" },
  { id: "des-design", name: "UI/UX Designer", departmentId: "dept-design", status: "ACTIVE" },
  { id: "des-qa", name: "QA Engineer", departmentId: "dept-qa", status: "ACTIVE" },
  { id: "des-bd", name: "Business Developer", departmentId: "dept-bd", status: "ACTIVE" },
  { id: "des-intern", name: "Intern", departmentId: "dept-frontend", status: "ACTIVE" },
];

function withLogin(user: Omit<User, "username" | "password">): User {
  if (user.id === "user-admin") {
    return { ...user, username: "admin", password: "Admin@123" };
  }
  if (user.id === "user-001") {
    return { ...user, username: "yogesh", password: "Yogesh@123" };
  }
  const firstName = user.name.split(" ")[0] ?? "employee";
  return { ...user, username: firstName.toLowerCase(), password: `${firstName}@123` };
}

const seedUsers: Omit<User, "username" | "password">[] = [
  { id: "user-admin", name: "Agency Admin", email: "admin@webcreatehub.com", phone: "+91 98765 43210", role: "MANAGEMENT", employeeId: null, avatarUrl: null },
  { id: "user-001", name: "Yogesh Powar", email: "yogesh.powar@webcreatehub.com", phone: "+91 98220 11001", role: "EMPLOYEE", employeeId: "emp-001", avatarUrl: null },
  { id: "user-002", name: "Aisha Khan", email: "aisha.khan@webcreatehub.com", phone: "+91 98220 11002", role: "EMPLOYEE", employeeId: "emp-002", avatarUrl: null },
  { id: "user-003", name: "Rohan Mehta", email: "rohan.mehta@webcreatehub.com", phone: "+91 98220 11003", role: "EMPLOYEE", employeeId: "emp-003", avatarUrl: null },
  { id: "user-004", name: "Priya Sharma", email: "priya.sharma@webcreatehub.com", phone: "+91 98220 11004", role: "EMPLOYEE", employeeId: "emp-004", avatarUrl: null },
  { id: "user-005", name: "Vikram Singh", email: "vikram.singh@webcreatehub.com", phone: "+91 98220 11005", role: "EMPLOYEE", employeeId: "emp-005", avatarUrl: null },
  { id: "user-006", name: "Neha Patel", email: "neha.patel@webcreatehub.com", phone: "+91 98220 11006", role: "EMPLOYEE", employeeId: "emp-006", avatarUrl: null },
  { id: "user-007", name: "Arjun Reddy", email: "arjun.reddy@webcreatehub.com", phone: "+91 98220 11007", role: "EMPLOYEE", employeeId: "emp-007", avatarUrl: null },
  { id: "user-008", name: "Sneha Iyer", email: "sneha.iyer@webcreatehub.com", phone: "+91 98220 11008", role: "EMPLOYEE", employeeId: "emp-008", avatarUrl: null },
  { id: "user-009", name: "Karan Joshi", email: "karan.joshi@webcreatehub.com", phone: "+91 98220 11009", role: "EMPLOYEE", employeeId: "emp-009", avatarUrl: null },
  { id: "user-010", name: "Meera Nair", email: "meera.nair@webcreatehub.com", phone: "+91 98220 11010", role: "EMPLOYEE", employeeId: "emp-010", avatarUrl: null },
  { id: "user-011", name: "Aditya Deshmukh", email: "aditya.deshmukh@webcreatehub.com", phone: "+91 98220 11011", role: "EMPLOYEE", employeeId: "emp-011", avatarUrl: null },
  { id: "user-012", name: "Fatima Sheikh", email: "fatima.sheikh@webcreatehub.com", phone: "+91 98220 11012", role: "EMPLOYEE", employeeId: "emp-012", avatarUrl: null },
  { id: "user-013", name: "Rahul Verma", email: "rahul.verma@webcreatehub.com", phone: "+91 98220 11013", role: "EMPLOYEE", employeeId: "emp-013", avatarUrl: null },
  { id: "user-014", name: "Ananya Gupta", email: "ananya.gupta@webcreatehub.com", phone: "+91 98220 11014", role: "EMPLOYEE", employeeId: "emp-014", avatarUrl: null },
  { id: "user-015", name: "Sameer Kulkarni", email: "sameer.kulkarni@webcreatehub.com", phone: "+91 98220 11015", role: "EMPLOYEE", employeeId: "emp-015", avatarUrl: null },
];

export const users: User[] = seedUsers.map(withLogin);

function employee(partial: Employee): Employee {
  return partial;
}

export const employees: Employee[] = [
  employee({ id: "emp-001", employeeCode: "WCH-001", userId: "user-001", fullName: "Yogesh Powar", avatarUrl: null, dateOfBirth: "1996-04-18", gender: "MALE", phone: "+91 98220 11001", personalEmail: "yogesh.powar@gmail.com", workEmail: "yogesh.powar@webcreatehub.com", address: "Kothrud, Pune", departmentId: "dept-frontend", designationId: "des-frontend", joiningDate: "2024-02-01", employmentType: "FULL_TIME", reportingPersonId: null, workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 72000, allowances: 18000, deductions: 4500, emergencyContact: { name: "Suresh Powar", relationship: "Father", phone: "+91 98220 21001" }, bankInformation: { accountHolder: "Yogesh Powar", bankName: "HDFC Bank", accountNumber: "XXXXXX4521", ifscCode: "HDFC0001234" } }),
  employee({ id: "emp-002", employeeCode: "WCH-002", userId: "user-002", fullName: "Aisha Khan", avatarUrl: null, dateOfBirth: "1994-11-03", gender: "FEMALE", phone: "+91 98220 11002", personalEmail: "aisha.khan@gmail.com", workEmail: "aisha.khan@webcreatehub.com", address: "Viman Nagar, Pune", departmentId: "dept-backend", designationId: "des-backend", joiningDate: "2023-11-15", employmentType: "FULL_TIME", reportingPersonId: null, workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 78000, allowances: 20000, deductions: 5000, emergencyContact: { name: "Imran Khan", relationship: "Brother", phone: "+91 98220 21002" }, bankInformation: { accountHolder: "Aisha Khan", bankName: "ICICI Bank", accountNumber: "XXXXXX8832", ifscCode: "ICIC0000456" } }),
  employee({ id: "emp-003", employeeCode: "WCH-003", userId: "user-003", fullName: "Rohan Mehta", avatarUrl: null, dateOfBirth: "1995-07-22", gender: "MALE", phone: "+91 98220 11003", personalEmail: "rohan.mehta@gmail.com", workEmail: "rohan.mehta@webcreatehub.com", address: "Baner, Pune", departmentId: "dept-frontend", designationId: "des-fullstack", joiningDate: "2024-05-06", employmentType: "FULL_TIME", reportingPersonId: "emp-001", workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 58000, allowances: 12000, deductions: 3800, emergencyContact: { name: "Kavita Mehta", relationship: "Mother", phone: "+91 98220 21003" }, bankInformation: { accountHolder: "Rohan Mehta", bankName: "SBI", accountNumber: "XXXXXX1190", ifscCode: "SBIN0000789" } }),
  employee({ id: "emp-004", employeeCode: "WCH-004", userId: "user-004", fullName: "Priya Sharma", avatarUrl: null, dateOfBirth: "1997-01-14", gender: "FEMALE", phone: "+91 98220 11004", personalEmail: "priya.sharma@gmail.com", workEmail: "priya.sharma@webcreatehub.com", address: "Aundh, Pune", departmentId: "dept-design", designationId: "des-design", joiningDate: "2024-01-08", employmentType: "FULL_TIME", reportingPersonId: null, workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 65000, allowances: 15000, deductions: 4200, emergencyContact: { name: "Rakesh Sharma", relationship: "Father", phone: "+91 98220 21004" }, bankInformation: { accountHolder: "Priya Sharma", bankName: "Axis Bank", accountNumber: "XXXXXX3344", ifscCode: "UTIB0000123" } }),
  employee({ id: "emp-005", employeeCode: "WCH-005", userId: "user-005", fullName: "Vikram Singh", avatarUrl: null, dateOfBirth: "1993-09-09", gender: "MALE", phone: "+91 98220 11005", personalEmail: "vikram.singh@gmail.com", workEmail: "vikram.singh@webcreatehub.com", address: "Hadapsar, Pune", departmentId: "dept-qa", designationId: "des-qa", joiningDate: "2023-08-21", employmentType: "FULL_TIME", reportingPersonId: null, workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 62000, allowances: 14000, deductions: 4000, emergencyContact: { name: "Anita Singh", relationship: "Spouse", phone: "+91 98220 21005" }, bankInformation: { accountHolder: "Vikram Singh", bankName: "HDFC Bank", accountNumber: "XXXXXX7781", ifscCode: "HDFC0001987" } }),
  employee({ id: "emp-006", employeeCode: "WCH-006", userId: "user-006", fullName: "Neha Patel", avatarUrl: null, dateOfBirth: "1998-03-27", gender: "FEMALE", phone: "+91 98220 11006", personalEmail: "neha.patel@gmail.com", workEmail: "neha.patel@webcreatehub.com", address: "Wakad, Pune", departmentId: "dept-frontend", designationId: "des-react", joiningDate: "2024-07-01", employmentType: "FULL_TIME", reportingPersonId: "emp-001", workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 48000, allowances: 10000, deductions: 3200, emergencyContact: { name: "Milan Patel", relationship: "Father", phone: "+91 98220 21006" }, bankInformation: { accountHolder: "Neha Patel", bankName: "Kotak Bank", accountNumber: "XXXXXX5520", ifscCode: "KKBK0000345" } }),
  employee({ id: "emp-007", employeeCode: "WCH-007", userId: "user-007", fullName: "Arjun Reddy", avatarUrl: null, dateOfBirth: "1994-06-11", gender: "MALE", phone: "+91 98220 11007", personalEmail: "arjun.reddy@gmail.com", workEmail: "arjun.reddy@webcreatehub.com", address: "Hinjewadi, Pune", departmentId: "dept-mobile", designationId: "des-mobile", joiningDate: "2024-03-18", employmentType: "FULL_TIME", reportingPersonId: null, workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 70000, allowances: 16000, deductions: 4400, emergencyContact: { name: "Lakshmi Reddy", relationship: "Mother", phone: "+91 98220 21007" }, bankInformation: { accountHolder: "Arjun Reddy", bankName: "ICICI Bank", accountNumber: "XXXXXX6612", ifscCode: "ICIC0000678" } }),
  employee({ id: "emp-008", employeeCode: "WCH-008", userId: "user-008", fullName: "Sneha Iyer", avatarUrl: null, dateOfBirth: "1996-12-02", gender: "FEMALE", phone: "+91 98220 11008", personalEmail: "sneha.iyer@gmail.com", workEmail: "sneha.iyer@webcreatehub.com", address: "Kharadi, Pune", departmentId: "dept-bd", designationId: "des-bd", joiningDate: "2024-04-22", employmentType: "FULL_TIME", reportingPersonId: null, workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 55000, allowances: 18000, deductions: 3600, emergencyContact: { name: "Ravi Iyer", relationship: "Father", phone: "+91 98220 21008" }, bankInformation: { accountHolder: "Sneha Iyer", bankName: "SBI", accountNumber: "XXXXXX2298", ifscCode: "SBIN0002211" } }),
  employee({ id: "emp-009", employeeCode: "WCH-009", userId: "user-009", fullName: "Karan Joshi", avatarUrl: null, dateOfBirth: "1992-08-30", gender: "MALE", phone: "+91 98220 11009", personalEmail: "karan.joshi@gmail.com", workEmail: "karan.joshi@webcreatehub.com", address: "Shivaji Nagar, Pune", departmentId: "dept-backend", designationId: "des-backend", joiningDate: "2023-09-11", employmentType: "FULL_TIME", reportingPersonId: "emp-002", workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 68000, allowances: 14000, deductions: 4300, emergencyContact: { name: "Nisha Joshi", relationship: "Spouse", phone: "+91 98220 21009" }, bankInformation: { accountHolder: "Karan Joshi", bankName: "Axis Bank", accountNumber: "XXXXXX9087", ifscCode: "UTIB0000567" } }),
  employee({ id: "emp-010", employeeCode: "WCH-010", userId: "user-010", fullName: "Meera Nair", avatarUrl: null, dateOfBirth: "1997-05-19", gender: "FEMALE", phone: "+91 98220 11010", personalEmail: "meera.nair@gmail.com", workEmail: "meera.nair@webcreatehub.com", address: "Kalyani Nagar, Pune", departmentId: "dept-qa", designationId: "des-qa", joiningDate: "2024-06-10", employmentType: "FULL_TIME", reportingPersonId: "emp-005", workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 42000, allowances: 8000, deductions: 2800, emergencyContact: { name: "Anil Nair", relationship: "Father", phone: "+91 98220 21010" }, bankInformation: { accountHolder: "Meera Nair", bankName: "HDFC Bank", accountNumber: "XXXXXX4410", ifscCode: "HDFC0002765" } }),
  employee({ id: "emp-011", employeeCode: "WCH-011", userId: "user-011", fullName: "Aditya Deshmukh", avatarUrl: null, dateOfBirth: "1995-02-08", gender: "MALE", phone: "+91 98220 11011", personalEmail: "aditya.deshmukh@gmail.com", workEmail: "aditya.deshmukh@webcreatehub.com", address: "Deccan, Pune", departmentId: "dept-backend", designationId: "des-fullstack", joiningDate: "2024-08-05", employmentType: "FULL_TIME", reportingPersonId: "emp-002", workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 50000, allowances: 11000, deductions: 3300, emergencyContact: { name: "Smita Deshmukh", relationship: "Mother", phone: "+91 98220 21011" }, bankInformation: { accountHolder: "Aditya Deshmukh", bankName: "Kotak Bank", accountNumber: "XXXXXX1209", ifscCode: "KKBK0000789" } }),
  employee({ id: "emp-012", employeeCode: "WCH-012", userId: "user-012", fullName: "Fatima Sheikh", avatarUrl: null, dateOfBirth: "1999-10-25", gender: "FEMALE", phone: "+91 98220 11012", personalEmail: "fatima.sheikh@gmail.com", workEmail: "fatima.sheikh@webcreatehub.com", address: "Camp, Pune", departmentId: "dept-design", designationId: "des-design", joiningDate: "2025-01-13", employmentType: "FULL_TIME", reportingPersonId: "emp-004", workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 40000, allowances: 9000, deductions: 2600, emergencyContact: { name: "Yasmin Sheikh", relationship: "Mother", phone: "+91 98220 21012" }, bankInformation: { accountHolder: "Fatima Sheikh", bankName: "ICICI Bank", accountNumber: "XXXXXX7765", ifscCode: "ICIC0000912" } }),
  employee({ id: "emp-013", employeeCode: "WCH-013", userId: "user-013", fullName: "Rahul Verma", avatarUrl: null, dateOfBirth: "2002-04-04", gender: "MALE", phone: "+91 98220 11013", personalEmail: "rahul.verma@gmail.com", workEmail: "rahul.verma@webcreatehub.com", address: "Pimple Saudagar, Pune", departmentId: "dept-frontend", designationId: "des-intern", joiningDate: "2026-01-06", employmentType: "INTERN", reportingPersonId: "emp-001", workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 15000, allowances: 2000, deductions: 400, emergencyContact: { name: "Sunita Verma", relationship: "Mother", phone: "+91 98220 21013" }, bankInformation: { accountHolder: "Rahul Verma", bankName: "SBI", accountNumber: "XXXXXX3348", ifscCode: "SBIN0003344" } }),
  employee({ id: "emp-014", employeeCode: "WCH-014", userId: "user-014", fullName: "Ananya Gupta", avatarUrl: null, dateOfBirth: "1996-09-16", gender: "FEMALE", phone: "+91 98220 11014", personalEmail: "ananya.gupta@gmail.com", workEmail: "ananya.gupta@webcreatehub.com", address: "Magarpatta, Pune", departmentId: "dept-mobile", designationId: "des-mobile", joiningDate: "2024-09-02", employmentType: "FULL_TIME", reportingPersonId: "emp-007", workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 52000, allowances: 12000, deductions: 3400, emergencyContact: { name: "Mohit Gupta", relationship: "Brother", phone: "+91 98220 21014" }, bankInformation: { accountHolder: "Ananya Gupta", bankName: "Axis Bank", accountNumber: "XXXXXX8891", ifscCode: "UTIB0000881" } }),
  employee({ id: "emp-015", employeeCode: "WCH-015", userId: "user-015", fullName: "Sameer Kulkarni", avatarUrl: null, dateOfBirth: "1991-12-29", gender: "MALE", phone: "+91 98220 11015", personalEmail: "sameer.kulkarni@gmail.com", workEmail: "sameer.kulkarni@webcreatehub.com", address: "Sinhagad Road, Pune", departmentId: "dept-bd", designationId: "des-bd", joiningDate: "2023-12-04", employmentType: "FULL_TIME", reportingPersonId: "emp-008", workLocation: "Pune", status: "ACTIVE", dailyRequiredHours: 9, basicSalary: 60000, allowances: 16000, deductions: 3900, emergencyContact: { name: "Pooja Kulkarni", relationship: "Spouse", phone: "+91 98220 21015" }, bankInformation: { accountHolder: "Sameer Kulkarni", bankName: "HDFC Bank", accountNumber: "XXXXXX2156", ifscCode: "HDFC0003012" } }),
];

export const leaveRequests: LeaveRequest[] = [
  { id: "leave-001", employeeId: "emp-008", type: "CASUAL", startDate: "2026-09-22", endDate: "2026-09-22", isHalfDay: false, reason: "Family function in Mumbai.", attachmentName: null, hasAttachment: false, status: "APPROVED", rejectionReason: null, reviewedBy: "user-admin", reviewedAt: at("2026-09-20", "11:15"), createdAt: at("2026-09-18", "16:40") },
  { id: "leave-002", employeeId: "emp-001", type: "SICK", startDate: "2026-09-25", endDate: "2026-09-25", isHalfDay: true, reason: "Doctor appointment in the afternoon.", attachmentName: "prescription.pdf", hasAttachment: false, status: "PENDING", rejectionReason: null, reviewedBy: null, reviewedAt: null, createdAt: at("2026-09-21", "10:05") },
  { id: "leave-003", employeeId: "emp-006", type: "PRIVILEGE", startDate: "2026-09-28", endDate: "2026-09-30", isHalfDay: false, reason: "Out-of-town personal travel.", attachmentName: null, hasAttachment: false, status: "PENDING", rejectionReason: null, reviewedBy: null, reviewedAt: null, createdAt: at("2026-09-19", "14:22") },
  { id: "leave-004", employeeId: "emp-012", type: "SICK", startDate: "2026-09-15", endDate: "2026-09-16", isHalfDay: false, reason: "Viral fever and rest advised.", attachmentName: "medical-note.pdf", hasAttachment: false, status: "APPROVED", rejectionReason: null, reviewedBy: "user-admin", reviewedAt: at("2026-09-15", "09:40"), createdAt: at("2026-09-15", "08:12") },
  { id: "leave-005", employeeId: "emp-003", type: "CASUAL", startDate: "2026-09-10", endDate: "2026-09-10", isHalfDay: false, reason: "Personal errand.", attachmentName: null, hasAttachment: false, status: "REJECTED", rejectionReason: "Sprint release is scheduled the same day.", reviewedBy: "user-admin", reviewedAt: at("2026-09-09", "17:05"), createdAt: at("2026-09-09", "11:30") },
  { id: "leave-006", employeeId: "emp-009", type: "UNPAID", startDate: "2026-08-28", endDate: "2026-08-29", isHalfDay: false, reason: "Family emergency travel.", attachmentName: null, hasAttachment: false, status: "APPROVED", rejectionReason: null, reviewedBy: "user-admin", reviewedAt: at("2026-08-27", "18:10"), createdAt: at("2026-08-27", "12:00") },
  { id: "leave-007", employeeId: "emp-014", type: "CASUAL", startDate: "2026-10-02", endDate: "2026-10-03", isHalfDay: false, reason: "Wedding in the family.", attachmentName: null, hasAttachment: false, status: "PENDING", rejectionReason: null, reviewedBy: null, reviewedAt: null, createdAt: at("2026-09-21", "18:45") },
  { id: "leave-008", employeeId: "emp-010", type: "CASUAL", startDate: "2026-09-04", endDate: "2026-09-04", isHalfDay: true, reason: "Bank work in the morning.", attachmentName: null, hasAttachment: false, status: "CANCELLED", rejectionReason: null, reviewedBy: null, reviewedAt: null, createdAt: at("2026-09-02", "09:18") },
  { id: "leave-009", employeeId: "emp-007", type: "PRIVILEGE", startDate: "2026-09-07", endDate: "2026-09-08", isHalfDay: false, reason: "Short family trip.", attachmentName: null, hasAttachment: false, status: "APPROVED", rejectionReason: null, reviewedBy: "user-admin", reviewedAt: at("2026-09-05", "10:20"), createdAt: at("2026-09-04", "15:33") },
  { id: "leave-010", employeeId: "emp-002", type: "SICK", startDate: "2026-09-26", endDate: "2026-09-26", isHalfDay: false, reason: "Dental procedure.", attachmentName: null, hasAttachment: false, status: "PENDING", rejectionReason: null, reviewedBy: null, reviewedAt: null, createdAt: at("2026-09-22", "09:10") },
];

export const leaveBalances: LeaveBalance[] = employees.map((item) => remainingFromApproved(item.id, leaveRequests));

export const holidays: Holiday[] = [
  { id: "hol-001", name: "Independence Day", date: "2026-08-15", type: "PUBLIC", description: "National holiday.", recurring: true },
  { id: "hol-002", name: "Ganesh Chaturthi", date: "2026-09-14", type: "RELIGIOUS", description: "Regional holiday in Maharashtra.", recurring: true },
  { id: "hol-003", name: "Gandhi Jayanti", date: "2026-10-02", type: "PUBLIC", description: "National holiday.", recurring: true },
  { id: "hol-004", name: "Diwali", date: "2026-11-08", type: "RELIGIOUS", description: "Festival of lights.", recurring: true },
  { id: "hol-005", name: "Diwali Laxmi Pujan", date: "2026-11-09", type: "COMPANY", description: "Company-observed festival holiday.", recurring: true },
  { id: "hol-006", name: "Christmas", date: "2026-12-25", type: "PUBLIC", description: "Public holiday.", recurring: true },
  { id: "hol-007", name: "Republic Day", date: "2026-01-26", type: "PUBLIC", description: "National holiday.", recurring: true },
  { id: "hol-008", name: "Company Foundation Day", date: "2026-10-18", type: "COMPANY", description: "Internal celebration and optional half-day.", recurring: true },
];

function isWorkDay(date: string): boolean {
  return isWorkingDay(date, settings, holidays);
}

function isApprovedLeave(employeeId: string, date: string): boolean {
  return leaveRequests.some((request) => {
    if (request.employeeId !== employeeId || request.status !== "APPROVED") {
      return false;
    }
    return date >= request.startDate && date <= request.endDate;
  });
}

function emptyDay(
  employeeId: string,
  date: string,
  status: AttendanceStatus,
  state: AttendanceState = "NOT_CLOCKED_IN",
): AttendanceRecord {
  return attendance({
    id: `att-${employeeId}-${date}`,
    employeeId,
    date,
    clockIn: null,
    clockOut: null,
    state,
    status,
    requiredHours: REQUIRED_DAILY_HOURS,
    workSession: null,
    breaks: [],
    lateMinutes: 0,
    notes: status === "ON_LEAVE" ? "Approved leave" : null,
  });
}

function completedDay(
  employeeId: string,
  date: string,
  clockIn: string,
  lunchStart: string,
  lunchEnd: string,
  personalStart: string | null,
  personalEnd: string | null,
  clockOut: string,
  lateMinutes: number,
): AttendanceRecord {
  const breaks: BreakRecord[] = [
    breakRecord(`brk-${employeeId}-${date}-lunch`, "LUNCH", at(date, lunchStart), at(date, lunchEnd)),
  ];
  if (personalStart && personalEnd) {
    breaks.push(
      breakRecord(`brk-${employeeId}-${date}-personal`, "PERSONAL", at(date, personalStart), at(date, personalEnd)),
    );
  }
  return attendance({
    id: `att-${employeeId}-${date}`,
    employeeId,
    date,
    clockIn: at(date, clockIn),
    clockOut: at(date, clockOut),
    state: "CLOCKED_OUT",
    status: lateMinutes > 0 ? "LATE" : "COMPLETED",
    requiredHours: REQUIRED_DAILY_HOURS,
    workSession: { startTime: at(date, clockIn), endTime: at(date, clockOut) },
    breaks,
    lateMinutes,
    notes: null,
  });
}

export const todayAttendance: AttendanceRecord[] = [
  attendance({
    id: "att-emp-001-2026-09-22",
    employeeId: "emp-001",
    date: TODAY,
    clockIn: at(TODAY, "09:30"),
    clockOut: null,
    state: "WORKING",
    status: "PRESENT",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "09:30"), endTime: null },
    breaks: [breakRecord("brk-001-lunch", "LUNCH", at(TODAY, "13:00"), at(TODAY, "14:00"))],
    lateMinutes: 0,
    notes: null,
  }),
  attendance({
    id: "att-emp-002-2026-09-22",
    employeeId: "emp-002",
    date: TODAY,
    clockIn: at(TODAY, "09:28"),
    clockOut: null,
    state: "ON_LUNCH_BREAK",
    status: "PRESENT",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "09:28"), endTime: null },
    breaks: [breakRecord("brk-002-lunch", "LUNCH", at(TODAY, "13:15"), null)],
    lateMinutes: 0,
    notes: null,
  }),
  attendance({
    id: "att-emp-003-2026-09-22",
    employeeId: "emp-003",
    date: TODAY,
    clockIn: at(TODAY, "09:12"),
    clockOut: null,
    state: "WORKING",
    status: "PRESENT",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "09:12"), endTime: null },
    breaks: [breakRecord("brk-003-lunch", "LUNCH", at(TODAY, "13:05"), at(TODAY, "13:50"))],
    lateMinutes: 0,
    notes: null,
  }),
  attendance({
    id: "att-emp-004-2026-09-22",
    employeeId: "emp-004",
    date: TODAY,
    clockIn: at(TODAY, "09:45"),
    clockOut: null,
    state: "ON_PERSONAL_BREAK",
    status: "LATE",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "09:45"), endTime: null },
    breaks: [
      breakRecord("brk-004-lunch", "LUNCH", at(TODAY, "13:00"), at(TODAY, "13:40")),
      breakRecord("brk-004-personal", "PERSONAL", at(TODAY, "15:40"), null),
    ],
    lateMinutes: 15,
    notes: null,
  }),
  attendance({
    id: "att-emp-005-2026-09-22",
    employeeId: "emp-005",
    date: TODAY,
    clockIn: at(TODAY, "09:20"),
    clockOut: at(TODAY, "19:45"),
    state: "CLOCKED_OUT",
    status: "COMPLETED",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "09:20"), endTime: at(TODAY, "19:45") },
    breaks: [
      breakRecord("brk-005-lunch", "LUNCH", at(TODAY, "13:00"), at(TODAY, "14:00")),
      breakRecord("brk-005-personal", "PERSONAL", at(TODAY, "16:00"), at(TODAY, "16:15")),
    ],
    lateMinutes: 0,
    notes: null,
  }),
  attendance({
    id: "att-emp-006-2026-09-22",
    employeeId: "emp-006",
    date: TODAY,
    clockIn: at(TODAY, "09:18"),
    clockOut: null,
    state: "WORKING",
    status: "PRESENT",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "09:18"), endTime: null },
    breaks: [breakRecord("brk-006-lunch", "LUNCH", at(TODAY, "13:10"), at(TODAY, "14:00"))],
    lateMinutes: 0,
    notes: null,
  }),
  emptyDay("emp-007", TODAY, "ABSENT"),
  emptyDay("emp-008", TODAY, "ON_LEAVE"),
  attendance({
    id: "att-emp-009-2026-09-22",
    employeeId: "emp-009",
    date: TODAY,
    clockIn: at(TODAY, "10:15"),
    clockOut: null,
    state: "WORKING",
    status: "LATE",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "10:15"), endTime: null },
    breaks: [breakRecord("brk-009-lunch", "LUNCH", at(TODAY, "13:30"), at(TODAY, "14:10"))],
    lateMinutes: 45,
    notes: null,
  }),
  attendance({
    id: "att-emp-010-2026-09-22",
    employeeId: "emp-010",
    date: TODAY,
    clockIn: at(TODAY, "09:25"),
    clockOut: null,
    state: "WORKING",
    status: "PRESENT",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "09:25"), endTime: null },
    breaks: [breakRecord("brk-010-lunch", "LUNCH", at(TODAY, "13:00"), at(TODAY, "13:45"))],
    lateMinutes: 0,
    notes: null,
  }),
  attendance({
    id: "att-emp-011-2026-09-22",
    employeeId: "emp-011",
    date: TODAY,
    clockIn: at(TODAY, "09:32"),
    clockOut: null,
    state: "WORKING",
    status: "PRESENT",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "09:32"), endTime: null },
    breaks: [breakRecord("brk-011-lunch", "LUNCH", at(TODAY, "13:20"), at(TODAY, "14:05"))],
    lateMinutes: 0,
    notes: null,
  }),
  emptyDay("emp-012", TODAY, "ABSENT"),
  attendance({
    id: "att-emp-013-2026-09-22",
    employeeId: "emp-013",
    date: TODAY,
    clockIn: at(TODAY, "09:50"),
    clockOut: null,
    state: "WORKING",
    status: "LATE",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "09:50"), endTime: null },
    breaks: [breakRecord("brk-013-lunch", "LUNCH", at(TODAY, "13:00"), at(TODAY, "13:30"))],
    lateMinutes: 20,
    notes: null,
  }),
  attendance({
    id: "att-emp-014-2026-09-22",
    employeeId: "emp-014",
    date: TODAY,
    clockIn: at(TODAY, "09:10"),
    clockOut: at(TODAY, "19:50"),
    state: "CLOCKED_OUT",
    status: "COMPLETED",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "09:10"), endTime: at(TODAY, "19:50") },
    breaks: [
      breakRecord("brk-014-lunch", "LUNCH", at(TODAY, "13:00"), at(TODAY, "14:00")),
      breakRecord("brk-014-personal", "PERSONAL", at(TODAY, "16:20"), at(TODAY, "16:50")),
    ],
    lateMinutes: 0,
    notes: null,
  }),
  attendance({
    id: "att-emp-015-2026-09-22",
    employeeId: "emp-015",
    date: TODAY,
    clockIn: at(TODAY, "09:22"),
    clockOut: null,
    state: "WORKING",
    status: "PRESENT",
    requiredHours: 9,
    workSession: { startTime: at(TODAY, "09:22"), endTime: null },
    breaks: [breakRecord("brk-015-lunch", "LUNCH", at(TODAY, "13:00"), at(TODAY, "13:55"))],
    lateMinutes: 0,
    notes: null,
  }),
];

function buildHistory(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const start = subDays(parseISO(TODAY), 28);

  for (let offset = 0; offset < 28; offset += 1) {
    const date = format(addDays(start, offset), "yyyy-MM-dd");
    if (date === TODAY || !isWorkDay(date)) {
      continue;
    }

    employees.forEach((item, index) => {
      if (isApprovedLeave(item.id, date)) {
        records.push(emptyDay(item.id, date, "ON_LEAVE"));
        return;
      }

      const seed = (index + 1) * 17 + parseISO(date).getDate();
      if (seed % 13 === 0) {
        records.push(emptyDay(item.id, date, "ABSENT"));
        return;
      }

      const late = seed % 7 === 0;
      const incomplete = seed % 11 === 0;
      const clockIn = late ? "10:05" : seed % 5 === 0 ? "09:18" : "09:28";
      const lunchStart = "13:00";
      const lunchEnd = seed % 2 === 0 ? "13:50" : "14:00";
      const personalStart = seed % 3 === 0 ? "16:10" : null;
      const personalEnd = personalStart ? "16:25" : null;
      const clockOut = incomplete ? "17:15" : late ? "20:00" : "19:20";
      const record = completedDay(
        item.id,
        date,
        clockIn,
        lunchStart,
        lunchEnd,
        personalStart,
        personalEnd,
        clockOut,
        late ? 35 : 0,
      );
      if (incomplete) {
        record.status = "INCOMPLETE";
      }
      records.push(record);
    });
  }

  return records;
}

export const attendanceRecords: AttendanceRecord[] = [...buildHistory(), ...todayAttendance];

export const announcements: Announcement[] = [
  { id: "ann-001", title: "Updated 9-hour attendance policy", description: "Active working time excludes lunch and personal breaks. The daily target remains 9 hours of active work.", audience: "ALL", departmentId: null, publishDate: "2026-09-16", status: "PUBLISHED", createdBy: "user-admin" },
  { id: "ann-002", title: "Diwali week work plan", description: "We will share the festival week roster next Monday. Please keep leave requests updated.", audience: "ALL", departmentId: null, publishDate: "2026-09-20", status: "PUBLISHED", createdBy: "user-admin" },
  { id: "ann-003", title: "Frontend sprint review", description: "Frontend team demo is scheduled for Thursday at 4:30 PM.", audience: "DEPARTMENT", departmentId: "dept-frontend", publishDate: "2026-09-21", status: "PUBLISHED", createdBy: "user-admin" },
  { id: "ann-004", title: "Draft: October holiday calendar", description: "Internal draft for upcoming October holidays and optional leave planning.", audience: "MANAGEMENT", departmentId: null, publishDate: "2026-09-22", status: "DRAFT", createdBy: "user-admin" },
];

export const notifications: Notification[] = [
  { id: "ntf-001", userId: "user-admin", type: "LEAVE_PENDING", title: "Leave request pending", message: "Yogesh Powar requested a half-day sick leave for 25 Sep.", read: false, createdAt: at("2026-09-21", "10:06"), href: "/leave" },
  { id: "ntf-002", userId: "user-admin", type: "LEAVE_PENDING", title: "Leave request pending", message: "Neha Patel requested privilege leave from 28-30 Sep.", read: false, createdAt: at("2026-09-19", "14:23"), href: "/leave" },
  { id: "ntf-003", userId: "user-admin", type: "LATE_ARRIVAL", title: "Late arrivals today", message: "Priya Sharma, Karan Joshi, and Rahul Verma clocked in after 09:40.", read: false, createdAt: at(TODAY, "10:20"), href: "/attendance" },
  { id: "ntf-004", userId: "user-admin", type: "ANNOUNCEMENT", title: "Draft announcement ready", message: "October holiday calendar is saved as draft.", read: true, createdAt: at(TODAY, "09:05"), href: "/announcements" },
  { id: "ntf-005", userId: "user-001", type: "LEAVE_PENDING", title: "Leave submitted", message: "Your half-day sick leave request is awaiting approval.", read: false, createdAt: at("2026-09-21", "10:06"), href: "/leave" },
  { id: "ntf-006", userId: "user-001", type: "ANNOUNCEMENT", title: "Policy update", message: "The 9-hour active work policy is now in effect.", read: true, createdAt: at("2026-09-16", "11:00"), href: "/announcements" },
  { id: "ntf-007", userId: "user-001", type: "HOLIDAY", title: "Upcoming holiday", message: "Gandhi Jayanti is observed on 02 Oct.", read: false, createdAt: at("2026-09-20", "09:00"), href: "/holidays" },
  { id: "ntf-008", userId: "user-008", type: "LEAVE_APPROVED", title: "Leave approved", message: "Your casual leave for 22 Sep has been approved.", read: true, createdAt: at("2026-09-20", "11:16"), href: "/leave" },
  { id: "ntf-009", userId: "user-003", type: "LEAVE_REJECTED", title: "Leave rejected", message: "Your casual leave for 10 Sep was rejected.", read: true, createdAt: at("2026-09-09", "17:06"), href: "/leave" },
  { id: "ntf-010", userId: "user-006", type: "LEAVE_PENDING", title: "Leave submitted", message: "Your privilege leave request is awaiting approval.", read: false, createdAt: at("2026-09-19", "14:23"), href: "/leave" },
];

export const documents: EmployeeDocument[] = [
  { id: "doc-001", employeeId: "emp-001", type: "OFFER_LETTER", name: "Offer Letter", fileName: "yogesh-offer-letter.pdf", expiryDate: null, status: "ACTIVE", uploadedAt: "2024-02-01", hasFile: false },
  { id: "doc-002", employeeId: "emp-001", type: "ID_PROOF", name: "Aadhaar Card", fileName: "yogesh-aadhaar.pdf", expiryDate: null, status: "ACTIVE", uploadedAt: "2024-02-01", hasFile: false },
  { id: "doc-003", employeeId: "emp-001", type: "RESUME", name: "Resume", fileName: "yogesh-resume.pdf", expiryDate: null, status: "ACTIVE", uploadedAt: "2024-01-28", hasFile: false },
  { id: "doc-004", employeeId: "emp-002", type: "OFFER_LETTER", name: "Offer Letter", fileName: "aisha-offer-letter.pdf", expiryDate: null, status: "ACTIVE", uploadedAt: "2023-11-15", hasFile: false },
  { id: "doc-005", employeeId: "emp-002", type: "CONTRACT", name: "Employment Contract", fileName: "aisha-contract.pdf", expiryDate: "2026-11-15", status: "ACTIVE", uploadedAt: "2023-11-15", hasFile: false },
  { id: "doc-006", employeeId: "emp-013", type: "RESUME", name: "Internship Resume", fileName: "rahul-resume.pdf", expiryDate: null, status: "ACTIVE", uploadedAt: "2026-01-06", hasFile: false },
  { id: "doc-007", employeeId: "emp-013", type: "CERTIFICATE", name: "College ID", fileName: "rahul-college-id.pdf", expiryDate: "2026-12-31", status: "ACTIVE", uploadedAt: "2026-01-06", hasFile: false },
  { id: "doc-008", employeeId: "emp-005", type: "ID_PROOF", name: "PAN Card", fileName: "vikram-pan.pdf", expiryDate: null, status: "ACTIVE", uploadedAt: "2023-08-21", hasFile: false },
  { id: "doc-009", employeeId: "emp-012", type: "OFFER_LETTER", name: "Offer Letter", fileName: "fatima-offer-letter.pdf", expiryDate: null, status: "PENDING", uploadedAt: "2025-01-13", hasFile: false },
];

export const payrollRecords: PayrollRecord[] = buildPayrollHistory(employees);

export function createSeedData(): AppData {
  return {
    users,
    employees,
    departments,
    designations,
    attendanceRecords,
    leaveBalances,
    leaveRequests,
    holidays,
    notifications,
    announcements,
    documents,
    payrollRecords,
    settings,
  };
}

export const demoAccounts = users.map((user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  employeeId: user.employeeId,
}));
