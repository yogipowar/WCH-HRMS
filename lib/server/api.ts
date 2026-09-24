import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { settings as defaultSettings } from "@/data/mock-data";
import type { AppData } from "@/data/mock-data";
import { execute, query } from "@/lib/server/db";
import { clearTokenCookie, signToken, tokenCookie, tokenFromRequest, verifyToken } from "@/lib/server/auth";
import type {
  Announcement,
  AttendanceRecord,
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

type Json = Record<string, unknown>;

function json(value: unknown) {
  return value == null ? null : JSON.stringify(value);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function number(value: unknown) {
  return Number(value ?? 0);
}

function bool(value: unknown) {
  return Boolean(Number(value) || value);
}

function dateOnly(value: unknown, fallback = ""): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const text = String(value ?? "");
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? fallback;
}

function publicUser(row: RowDataPacket): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    employeeId: row.employee_id,
    avatarUrl: row.avatar_url,
    username: row.username,
    password: "",
  };
}

function mapEmployee(row: RowDataPacket): Employee {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    userId: row.user_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    dateOfBirth: dateOnly(row.date_of_birth),
    gender: row.gender,
    phone: row.phone,
    personalEmail: row.personal_email,
    workEmail: row.work_email,
    address: row.address,
    departmentId: row.department_id,
    designationId: row.designation_id,
    joiningDate: dateOnly(row.joining_date),
    employmentType: row.employment_type,
    reportingPersonId: row.reporting_person_id,
    workLocation: row.work_location,
    status: row.status,
    dailyRequiredHours: number(row.daily_required_hours),
    basicSalary: number(row.basic_salary),
    allowances: number(row.allowances),
    deductions: number(row.deductions),
    emergencyContact: parseJson(row.emergency_contact, { name: "", relationship: "", phone: "" }),
    bankInformation: parseJson(row.bank_information, {
      accountHolder: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
    }),
  };
}

function mapAttendance(row: RowDataPacket): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: dateOnly(row.date),
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    state: row.state,
    status: row.status,
    requiredHours: number(row.required_hours),
    activeWorkingMinutes: number(row.active_working_minutes),
    breakMinutes: number(row.break_minutes),
    workSession: parseJson(row.work_session, null),
    breaks: parseJson(row.breaks_json, []),
    lateMinutes: number(row.late_minutes),
    notes: row.notes,
  };
}

function mapLeave(row: RowDataPacket): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type,
    startDate: dateOnly(row.start_date),
    endDate: dateOnly(row.end_date),
    isHalfDay: bool(row.is_half_day),
    reason: row.reason,
    attachmentName: row.attachment_name,
    status: row.status,
    rejectionReason: row.rejection_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

function mapHoliday(row: RowDataPacket): Holiday {
  return {
    id: row.id,
    name: row.name,
    date: dateOnly(row.date),
    type: row.type,
    description: row.description,
    recurring: bool(row.recurring),
  };
}

function mapNotification(row: RowDataPacket): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: bool(row.is_read),
    createdAt: row.created_at,
    href: row.href,
  };
}

function mapAnnouncement(row: RowDataPacket): Announcement {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    audience: row.audience,
    departmentId: row.department_id,
    publishDate: dateOnly(row.publish_date),
    status: row.status,
    createdBy: row.created_by,
  };
}

function mapDocument(row: RowDataPacket): EmployeeDocument {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type,
    name: row.name,
    fileName: row.file_name,
    expiryDate: row.expiry_date ? dateOnly(row.expiry_date) : null,
    status: row.status,
    uploadedAt: dateOnly(row.uploaded_at),
  };
}

function mapPayroll(row: RowDataPacket): PayrollRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    period: row.period,
    basicSalary: number(row.basic_salary),
    allowances: number(row.allowances),
    deductions: number(row.deductions),
    grossSalary: number(row.gross_salary),
    netSalary: number(row.net_salary),
    status: row.status,
    payslipAvailable: bool(row.payslip_available),
  };
}

export async function loadBootstrap(): Promise<AppData> {
  const [
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
    settingsRows,
  ] = await Promise.all([
    query("SELECT * FROM users"),
    query("SELECT * FROM employees"),
    query("SELECT * FROM departments"),
    query("SELECT * FROM designations"),
    query("SELECT * FROM attendance_records"),
    query("SELECT * FROM leave_balances"),
    query("SELECT * FROM leave_requests"),
    query("SELECT * FROM holidays"),
    query("SELECT * FROM notifications"),
    query("SELECT * FROM announcements"),
    query("SELECT * FROM documents"),
    query("SELECT * FROM payroll_records"),
    query("SELECT payload FROM settings WHERE id = 1"),
  ]);

  return {
    users: users.map(publicUser),
    employees: employees.map(mapEmployee),
    departments: departments.map((row) => ({
      id: row.id,
      name: row.name,
      headEmployeeId: row.head_employee_id,
      status: row.status,
      createdAt: dateOnly(row.created_at),
      description: row.description,
    })),
    designations: designations.map((row) => ({
      id: row.id,
      name: row.name,
      departmentId: row.department_id,
      status: row.status,
    })),
    attendanceRecords: attendanceRecords.map(mapAttendance),
    leaveBalances: leaveBalances.map((row) => ({
      employeeId: row.employee_id,
      casual: number(row.casual),
      sick: number(row.sick),
      privilege: number(row.privilege),
    })),
    leaveRequests: leaveRequests.map(mapLeave),
    holidays: holidays.map(mapHoliday),
    notifications: notifications.map(mapNotification),
    announcements: announcements.map(mapAnnouncement),
    documents: documents.map(mapDocument),
    payrollRecords: payrollRecords.map(mapPayroll),
    settings: parseJson<CompanySettings>(settingsRows[0]?.payload, defaultSettings),
  };
}

async function upsertEmployee(employee: Employee) {
  await execute(
    `INSERT INTO employees (
      id, employee_code, user_id, full_name, avatar_url, date_of_birth, gender, phone,
      personal_email, work_email, address, department_id, designation_id, joining_date,
      employment_type, reporting_person_id, work_location, status, daily_required_hours,
      basic_salary, allowances, deductions, emergency_contact, bank_information
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      employee_code=VALUES(employee_code), user_id=VALUES(user_id), full_name=VALUES(full_name),
      avatar_url=VALUES(avatar_url), date_of_birth=VALUES(date_of_birth), gender=VALUES(gender),
      phone=VALUES(phone), personal_email=VALUES(personal_email), work_email=VALUES(work_email),
      address=VALUES(address), department_id=VALUES(department_id), designation_id=VALUES(designation_id),
      joining_date=VALUES(joining_date), employment_type=VALUES(employment_type),
      reporting_person_id=VALUES(reporting_person_id), work_location=VALUES(work_location),
      status=VALUES(status), daily_required_hours=VALUES(daily_required_hours),
      basic_salary=VALUES(basic_salary), allowances=VALUES(allowances), deductions=VALUES(deductions),
      emergency_contact=VALUES(emergency_contact), bank_information=VALUES(bank_information)`,
    [
      employee.id,
      employee.employeeCode,
      employee.userId,
      employee.fullName,
      employee.avatarUrl,
      employee.dateOfBirth,
      employee.gender,
      employee.phone,
      employee.personalEmail,
      employee.workEmail,
      employee.address,
      employee.departmentId,
      employee.designationId,
      employee.joiningDate,
      employee.employmentType,
      employee.reportingPersonId,
      employee.workLocation,
      employee.status,
      employee.dailyRequiredHours,
      employee.basicSalary,
      employee.allowances,
      employee.deductions,
      json(employee.emergencyContact),
      json(employee.bankInformation),
    ],
  );
}

async function upsertUser(user: User, password?: string) {
  const hash = password ? await bcrypt.hash(password, 10) : null;
  if (hash) {
    await execute(
      `INSERT INTO users (id, name, email, phone, role, employee_id, avatar_url, username, password_hash)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), phone=VALUES(phone),
         role=VALUES(role), employee_id=VALUES(employee_id), avatar_url=VALUES(avatar_url),
         username=VALUES(username), password_hash=VALUES(password_hash)`,
      [user.id, user.name, user.email, user.phone, user.role, user.employeeId, user.avatarUrl, user.username, hash],
    );
    return;
  }
  await execute(
    `INSERT INTO users (id, name, email, phone, role, employee_id, avatar_url, username, password_hash)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), phone=VALUES(phone),
       role=VALUES(role), employee_id=VALUES(employee_id), avatar_url=VALUES(avatar_url),
       username=VALUES(username)`,
    [user.id, user.name, user.email, user.phone, user.role, user.employeeId, user.avatarUrl, user.username, ""],
  );
}

async function upsertPayroll(record: PayrollRecord) {
  await execute(
    `INSERT INTO payroll_records (
      id, employee_id, period, basic_salary, allowances, deductions, gross_salary, net_salary, status, payslip_available
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE basic_salary=VALUES(basic_salary), allowances=VALUES(allowances),
       deductions=VALUES(deductions), gross_salary=VALUES(gross_salary), net_salary=VALUES(net_salary),
       status=VALUES(status), payslip_available=VALUES(payslip_available)`,
    [
      record.id,
      record.employeeId,
      record.period,
      record.basicSalary,
      record.allowances,
      record.deductions,
      record.grossSalary,
      record.netSalary,
      record.status,
      record.payslipAvailable ? 1 : 0,
    ],
  );
}

async function upsertAttendance(record: AttendanceRecord) {
  await execute(
    `INSERT INTO attendance_records (
      id, employee_id, date, clock_in, clock_out, state, status, required_hours,
      active_working_minutes, break_minutes, work_session, breaks_json, late_minutes, notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      clock_in=VALUES(clock_in), clock_out=VALUES(clock_out), state=VALUES(state), status=VALUES(status),
      required_hours=VALUES(required_hours), active_working_minutes=VALUES(active_working_minutes),
      break_minutes=VALUES(break_minutes), work_session=VALUES(work_session), breaks_json=VALUES(breaks_json),
      late_minutes=VALUES(late_minutes), notes=VALUES(notes)`,
    [
      record.id,
      record.employeeId,
      record.date,
      record.clockIn,
      record.clockOut,
      record.state,
      record.status,
      record.requiredHours,
      record.activeWorkingMinutes,
      record.breakMinutes,
      json(record.workSession),
      json(record.breaks ?? []),
      record.lateMinutes,
      record.notes,
    ],
  );
}

async function requireUser(request: Request) {
  const payload = verifyToken(tokenFromRequest(request));
  if (!payload) return null;
  const rows = await query("SELECT * FROM users WHERE id = ?", [payload.sub]);
  return rows[0] ? publicUser(rows[0]) : null;
}

function jsonResponse(status: number, payload: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export async function handleApiRequest(request: Request, parts: string[]) {
  try {
    if (parts[0] === "health" && request.method === "GET") {
      return jsonResponse(200, { ok: true });
    }

    if (parts[0] === "auth" && parts[1] === "login" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Json;
      const username = String(body.username || "").trim().toLowerCase();
      const password = String(body.password || "");
      const rows = await query(
        "SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?",
        [username, username],
      );
      const account = rows[0];
      if (!account || !(await bcrypt.compare(password, account.password_hash))) {
        return jsonResponse(401, { error: "The username or password is incorrect." });
      }
      if (account.employee_id) {
        const employees = await query("SELECT status FROM employees WHERE id = ?", [account.employee_id]);
        if (employees[0]?.status === "INACTIVE") {
          return jsonResponse(401, { error: "The username or password is incorrect." });
        }
      }
      const user = publicUser(account);
      const remember = Boolean(body.remember);
      const token = signToken(user, remember);
      const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
      return jsonResponse(200, { user, token }, { "Set-Cookie": tokenCookie(token, maxAge) });
    }

    if (parts[0] === "auth" && parts[1] === "logout" && request.method === "POST") {
      return jsonResponse(200, { ok: true }, { "Set-Cookie": clearTokenCookie() });
    }

    const user = await requireUser(request);
    if (!user) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    if (parts[0] === "auth" && parts[1] === "me" && request.method === "GET") {
      return jsonResponse(200, { user });
    }

    if (parts[0] === "bootstrap" && request.method === "GET") {
      return jsonResponse(200, await loadBootstrap());
    }

    if (parts[0] === "employees" && request.method === "POST") {
      const body = (await request.json()) as {
        employee: Employee;
        user: User;
        leaveBalance?: LeaveBalance;
        payrollRecord?: PayrollRecord;
      };
      await upsertEmployee(body.employee);
      await upsertUser(body.user, body.user.password);
      if (body.leaveBalance) {
        await execute(
          `INSERT INTO leave_balances (employee_id, casual, sick, privilege) VALUES (?,?,?,?)
           ON DUPLICATE KEY UPDATE casual=VALUES(casual), sick=VALUES(sick), privilege=VALUES(privilege)`,
          [body.leaveBalance.employeeId, body.leaveBalance.casual, body.leaveBalance.sick, body.leaveBalance.privilege],
        );
      }
      if (body.payrollRecord) await upsertPayroll(body.payrollRecord);
      return jsonResponse(200, { ok: true });
    }

    if (parts[0] === "employees" && parts[1] && request.method === "PATCH") {
      const body = (await request.json()) as {
        employee?: Employee;
        user?: User;
        payrollRecord?: PayrollRecord;
      };
      if (body.employee) await upsertEmployee(body.employee);
      if (body.user) await upsertUser(body.user, body.user.password || undefined);
      if (body.payrollRecord) await upsertPayroll(body.payrollRecord);
      return jsonResponse(200, { ok: true });
    }

    if (parts[0] === "departments" && request.method === "POST") {
      const item = (await request.json()) as Department;
      await execute(
        `INSERT INTO departments (id, name, head_employee_id, status, created_at, description)
         VALUES (?,?,?,?,?,?)`,
        [item.id, item.name, item.headEmployeeId, item.status, item.createdAt, item.description],
      );
      return jsonResponse(200, item);
    }

    if (parts[0] === "departments" && parts[1] && request.method === "PATCH") {
      const item = (await request.json()) as Department;
      await execute(
        `UPDATE departments SET name=?, head_employee_id=?, status=?, description=? WHERE id=?`,
        [item.name, item.headEmployeeId, item.status, item.description, parts[1]],
      );
      return jsonResponse(200, { ok: true });
    }

    if (parts[0] === "designations" && request.method === "POST") {
      const item = (await request.json()) as Designation;
      await execute(`INSERT INTO designations (id, name, department_id, status) VALUES (?,?,?,?)`, [
        item.id,
        item.name,
        item.departmentId,
        item.status,
      ]);
      return jsonResponse(200, item);
    }

    if (parts[0] === "designations" && parts[1] && request.method === "PATCH") {
      const item = (await request.json()) as Designation;
      await execute(`UPDATE designations SET name=?, department_id=?, status=? WHERE id=?`, [
        item.name,
        item.departmentId,
        item.status,
        parts[1],
      ]);
      return jsonResponse(200, { ok: true });
    }

    if (parts[0] === "holidays" && request.method === "POST") {
      const item = (await request.json()) as Holiday;
      await execute(`INSERT INTO holidays (id, name, date, type, description, recurring) VALUES (?,?,?,?,?,?)`, [
        item.id,
        item.name,
        item.date,
        item.type,
        item.description,
        item.recurring ? 1 : 0,
      ]);
      return jsonResponse(200, item);
    }

    if (parts[0] === "holidays" && parts[1] && request.method === "PATCH") {
      const item = (await request.json()) as Holiday;
      await execute(`UPDATE holidays SET name=?, date=?, type=?, description=?, recurring=? WHERE id=?`, [
        item.name,
        item.date,
        item.type,
        item.description,
        item.recurring ? 1 : 0,
        parts[1],
      ]);
      return jsonResponse(200, { ok: true });
    }

    if (parts[0] === "holidays" && parts[1] && request.method === "DELETE") {
      await execute("DELETE FROM holidays WHERE id = ?", [parts[1]]);
      return jsonResponse(200, { ok: true });
    }

    if (parts[0] === "leave" && request.method === "POST") {
      const item = (await request.json()) as LeaveRequest;
      await execute(
        `INSERT INTO leave_requests (
          id, employee_id, type, start_date, end_date, is_half_day, reason, attachment_name,
          status, rejection_reason, reviewed_by, reviewed_at, created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          item.id,
          item.employeeId,
          item.type,
          item.startDate,
          item.endDate,
          item.isHalfDay ? 1 : 0,
          item.reason,
          item.attachmentName,
          item.status,
          item.rejectionReason,
          item.reviewedBy,
          item.reviewedAt,
          item.createdAt,
        ],
      );
      return jsonResponse(200, item);
    }

    if (parts[0] === "leave" && parts[1] && parts[2] === "status" && request.method === "PATCH") {
      const body = (await request.json()) as { request: LeaveRequest; balance?: LeaveBalance };
      await execute(
        `UPDATE leave_requests SET status=?, reviewed_by=?, reviewed_at=?, rejection_reason=? WHERE id=?`,
        [body.request.status, body.request.reviewedBy, body.request.reviewedAt, body.request.rejectionReason, parts[1]],
      );
      if (body.balance) {
        await execute(`UPDATE leave_balances SET casual=?, sick=?, privilege=? WHERE employee_id=?`, [
          body.balance.casual,
          body.balance.sick,
          body.balance.privilege,
          body.balance.employeeId,
        ]);
      }
      return jsonResponse(200, { ok: true });
    }

    if (parts[0] === "attendance" && request.method === "PUT") {
      const record = (await request.json()) as AttendanceRecord;
      await upsertAttendance(record);
      return jsonResponse(200, record);
    }

    if (parts[0] === "announcements" && request.method === "POST") {
      const item = (await request.json()) as Announcement;
      await execute(
        `INSERT INTO announcements (id, title, description, audience, department_id, publish_date, status, created_by)
         VALUES (?,?,?,?,?,?,?,?)`,
        [item.id, item.title, item.description, item.audience, item.departmentId, item.publishDate, item.status, item.createdBy],
      );
      return jsonResponse(200, item);
    }

    if (parts[0] === "announcements" && parts[1] && request.method === "PATCH") {
      const item = (await request.json()) as Announcement;
      await execute(
        `UPDATE announcements SET title=?, description=?, audience=?, department_id=?, publish_date=?, status=? WHERE id=?`,
        [item.title, item.description, item.audience, item.departmentId, item.publishDate, item.status, parts[1]],
      );
      return jsonResponse(200, { ok: true });
    }

    if (parts[0] === "documents" && request.method === "POST") {
      const item = (await request.json()) as EmployeeDocument;
      await execute(
        `INSERT INTO documents (id, employee_id, type, name, file_name, expiry_date, status, uploaded_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [item.id, item.employeeId, item.type, item.name, item.fileName, item.expiryDate, item.status, item.uploadedAt],
      );
      return jsonResponse(200, item);
    }

    if (parts[0] === "notifications" && parts[1] === "read-all" && request.method === "POST") {
      const body = (await request.json()) as { userId: string };
      await execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [body.userId]);
      return jsonResponse(200, { ok: true });
    }

    if (parts[0] === "notifications" && parts[1] && request.method === "PATCH") {
      await execute("UPDATE notifications SET is_read = 1 WHERE id = ?", [parts[1]]);
      return jsonResponse(200, { ok: true });
    }

    if (parts[0] === "settings" && request.method === "PATCH") {
      const settings = (await request.json()) as CompanySettings;
      await execute(
        "INSERT INTO settings (id, payload) VALUES (1, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload)",
        [json(settings)],
      );
      return jsonResponse(200, settings);
    }

    return jsonResponse(404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Server error" });
  }
}
