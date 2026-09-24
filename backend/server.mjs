import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "u572425523_hrmswch",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "u572425523_hrmswch",
};

const JWT_SECRET = process.env.JWT_SECRET || "wch-hrms-change-this-secret";
const PORT = Number(process.env.API_PORT || 4000);
const COOKIE_SECURE = process.env.API_COOKIE_SECURE === "true";
function tokenCookie(token, maxAge) {
  const flags = COOKIE_SECURE ? "; Secure; SameSite=None" : "; SameSite=Lax";
  return `wch_hrms_token=${encodeURIComponent(token)}; HttpOnly; Path=/${flags}; Max-Age=${maxAge}`;
}
function clearCookie() {
  const flags = COOKIE_SECURE ? "; Secure; SameSite=None" : "; SameSite=Lax";
  return `wch_hrms_token=; HttpOnly; Path=/${flags}; Max-Age=0`;
}
const ALLOWED_ORIGINS = (process.env.API_CORS_ORIGINS || "http://localhost:3000,https://yogipowar.github.io")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

let pool;

function json(value) {
  return value == null ? null : JSON.stringify(value);
}

function parseJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function number(value) {
  return Number(value ?? 0);
}

function bool(value) {
  return Boolean(value);
}

function signToken(user, remember) {
  const payload = {
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function publicUser(row) {
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

function mapEmployee(row) {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    userId: row.user_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    dateOfBirth: String(row.date_of_birth).slice(0, 10),
    gender: row.gender,
    phone: row.phone,
    personalEmail: row.personal_email,
    workEmail: row.work_email,
    address: row.address,
    departmentId: row.department_id,
    designationId: row.designation_id,
    joiningDate: String(row.joining_date).slice(0, 10),
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

function mapAttendance(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: String(row.date).slice(0, 10),
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

function mapLeave(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type,
    startDate: String(row.start_date).slice(0, 10),
    endDate: String(row.end_date).slice(0, 10),
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

function mapHoliday(row) {
  return {
    id: row.id,
    name: row.name,
    date: String(row.date).slice(0, 10),
    type: row.type,
    description: row.description,
    recurring: bool(row.recurring),
  };
}

function mapNotification(row) {
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

function mapAnnouncement(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    audience: row.audience,
    departmentId: row.department_id,
    publishDate: String(row.publish_date).slice(0, 10),
    status: row.status,
    createdBy: row.created_by,
  };
}

function mapDocument(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type,
    name: row.name,
    fileName: row.file_name,
    expiryDate: row.expiry_date ? String(row.expiry_date).slice(0, 10) : null,
    status: row.status,
    uploadedAt: String(row.uploaded_at).slice(0, 10),
  };
}

function mapPayroll(row) {
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

async function bootstrap() {
  const [users] = await pool.query("SELECT * FROM users");
  const [employees] = await pool.query("SELECT * FROM employees");
  const [departments] = await pool.query("SELECT * FROM departments");
  const [designations] = await pool.query("SELECT * FROM designations");
  const [attendanceRecords] = await pool.query("SELECT * FROM attendance_records");
  const [leaveBalances] = await pool.query("SELECT * FROM leave_balances");
  const [leaveRequests] = await pool.query("SELECT * FROM leave_requests");
  const [holidays] = await pool.query("SELECT * FROM holidays");
  const [notifications] = await pool.query("SELECT * FROM notifications");
  const [announcements] = await pool.query("SELECT * FROM announcements");
  const [documents] = await pool.query("SELECT * FROM documents");
  const [payrollRecords] = await pool.query("SELECT * FROM payroll_records");
  const [settingsRows] = await pool.query("SELECT payload FROM settings WHERE id = 1");
  return {
    users: users.map(publicUser),
    employees: employees.map(mapEmployee),
    departments: departments.map((row) => ({
      id: row.id,
      name: row.name,
      headEmployeeId: row.head_employee_id,
      status: row.status,
      createdAt: String(row.created_at).slice(0, 10),
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
    settings: parseJson(settingsRows[0]?.payload, {}),
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function tokenFromRequest(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)wch_hrms_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function send(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  };
}

async function requireUser(req) {
  const payload = verifyToken(tokenFromRequest(req));
  if (!payload) return null;
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [payload.sub]);
  return rows[0] ? publicUser(rows[0]) : null;
}

async function upsertEmployee(employee) {
  await pool.query(
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

async function upsertUser(user, password) {
  const hash = password ? await bcrypt.hash(password, 10) : null;
  if (hash) {
    await pool.query(
      `INSERT INTO users (id, name, email, phone, role, employee_id, avatar_url, username, password_hash)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), phone=VALUES(phone),
         role=VALUES(role), employee_id=VALUES(employee_id), avatar_url=VALUES(avatar_url),
         username=VALUES(username), password_hash=VALUES(password_hash)`,
      [user.id, user.name, user.email, user.phone, user.role, user.employeeId, user.avatarUrl, user.username, hash],
    );
    return;
  }
  await pool.query(
    `INSERT INTO users (id, name, email, phone, role, employee_id, avatar_url, username, password_hash)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), phone=VALUES(phone),
       role=VALUES(role), employee_id=VALUES(employee_id), avatar_url=VALUES(avatar_url),
       username=VALUES(username)`,
    [user.id, user.name, user.email, user.phone, user.role, user.employeeId, user.avatarUrl, user.username, ""],
  );
}

async function upsertAttendance(record) {
  await pool.query(
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

async function handle(req, res) {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] !== "api") {
    send(res, 404, { error: "Not found" }, headers);
    return;
  }

  try {
    if (parts[1] === "health" && req.method === "GET") {
      send(res, 200, { ok: true }, headers);
      return;
    }

    if (parts[1] === "auth" && parts[2] === "login" && req.method === "POST") {
      const body = await readBody(req);
      const username = String(body.username || "").trim().toLowerCase();
      const password = String(body.password || "");
      const [rows] = await pool.query(
        "SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?",
        [username, username],
      );
      const account = rows[0];
      if (!account || !(await bcrypt.compare(password, account.password_hash))) {
        send(res, 401, { error: "The username or password is incorrect." }, headers);
        return;
      }
      if (account.employee_id) {
        const [employees] = await pool.query("SELECT status FROM employees WHERE id = ?", [account.employee_id]);
        if (employees[0]?.status === "INACTIVE") {
          send(res, 401, { error: "The username or password is incorrect." }, headers);
          return;
        }
      }
      const user = publicUser(account);
      const token = signToken(user, Boolean(body.remember));
      const maxAge = body.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
      send(
        res,
        200,
        { user, token },
        {
          ...headers,
          "Set-Cookie": tokenCookie(token, maxAge),
        },
      );
      return;
    }

    if (parts[1] === "auth" && parts[2] === "logout" && req.method === "POST") {
      send(res, 200, { ok: true }, {
        ...headers,
        "Set-Cookie": clearCookie(),
      });
      return;
    }

    const user = await requireUser(req);
    if (!user) {
      send(res, 401, { error: "Unauthorized" }, headers);
      return;
    }

    if (parts[1] === "auth" && parts[2] === "me" && req.method === "GET") {
      send(res, 200, { user }, headers);
      return;
    }

    if (parts[1] === "bootstrap" && req.method === "GET") {
      send(res, 200, await bootstrap(), headers);
      return;
    }

    if (parts[1] === "employees" && req.method === "POST") {
      const body = await readBody(req);
      await upsertEmployee(body.employee);
      await upsertUser(body.user, body.user.password);
      if (body.leaveBalance) {
        await pool.query(
          `INSERT INTO leave_balances (employee_id, casual, sick, privilege) VALUES (?,?,?,?)
           ON DUPLICATE KEY UPDATE casual=VALUES(casual), sick=VALUES(sick), privilege=VALUES(privilege)`,
          [body.leaveBalance.employeeId, body.leaveBalance.casual, body.leaveBalance.sick, body.leaveBalance.privilege],
        );
      }
      if (body.payrollRecord) {
        const record = body.payrollRecord;
        await pool.query(
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
      send(res, 200, { ok: true }, headers);
      return;
    }

    if (parts[1] === "employees" && parts[2] && req.method === "PATCH") {
      const body = await readBody(req);
      if (body.employee) await upsertEmployee(body.employee);
      if (body.user) await upsertUser(body.user, body.user.password || undefined);
      if (body.payrollRecord) {
        const record = body.payrollRecord;
        await pool.query(
          `INSERT INTO payroll_records (
            id, employee_id, period, basic_salary, allowances, deductions, gross_salary, net_salary, status, payslip_available
          ) VALUES (?,?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE basic_salary=VALUES(basic_salary), allowances=VALUES(allowances),
             deductions=VALUES(deductions), gross_salary=VALUES(gross_salary), net_salary=VALUES(net_salary)`,
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
      send(res, 200, { ok: true }, headers);
      return;
    }

    if (parts[1] === "departments" && req.method === "POST") {
      const item = await readBody(req);
      await pool.query(
        `INSERT INTO departments (id, name, head_employee_id, status, created_at, description)
         VALUES (?,?,?,?,?,?)`,
        [item.id, item.name, item.headEmployeeId, item.status, item.createdAt, item.description],
      );
      send(res, 200, item, headers);
      return;
    }

    if (parts[1] === "departments" && parts[2] && req.method === "PATCH") {
      const item = await readBody(req);
      await pool.query(
        `UPDATE departments SET name=?, head_employee_id=?, status=?, description=? WHERE id=?`,
        [item.name, item.headEmployeeId, item.status, item.description, parts[2]],
      );
      send(res, 200, { ok: true }, headers);
      return;
    }

    if (parts[1] === "designations" && req.method === "POST") {
      const item = await readBody(req);
      await pool.query(
        `INSERT INTO designations (id, name, department_id, status) VALUES (?,?,?,?)`,
        [item.id, item.name, item.departmentId, item.status],
      );
      send(res, 200, item, headers);
      return;
    }

    if (parts[1] === "designations" && parts[2] && req.method === "PATCH") {
      const item = await readBody(req);
      await pool.query(
        `UPDATE designations SET name=?, department_id=?, status=? WHERE id=?`,
        [item.name, item.departmentId, item.status, parts[2]],
      );
      send(res, 200, { ok: true }, headers);
      return;
    }

    if (parts[1] === "holidays" && req.method === "POST") {
      const item = await readBody(req);
      await pool.query(
        `INSERT INTO holidays (id, name, date, type, description, recurring) VALUES (?,?,?,?,?,?)`,
        [item.id, item.name, item.date, item.type, item.description, item.recurring ? 1 : 0],
      );
      send(res, 200, item, headers);
      return;
    }

    if (parts[1] === "holidays" && parts[2] && req.method === "PATCH") {
      const item = await readBody(req);
      await pool.query(
        `UPDATE holidays SET name=?, date=?, type=?, description=?, recurring=? WHERE id=?`,
        [item.name, item.date, item.type, item.description, item.recurring ? 1 : 0, parts[2]],
      );
      send(res, 200, { ok: true }, headers);
      return;
    }

    if (parts[1] === "holidays" && parts[2] && req.method === "DELETE") {
      await pool.query("DELETE FROM holidays WHERE id = ?", [parts[2]]);
      send(res, 200, { ok: true }, headers);
      return;
    }

    if (parts[1] === "leave" && req.method === "POST") {
      const item = await readBody(req);
      await pool.query(
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
      send(res, 200, item, headers);
      return;
    }

    if (parts[1] === "leave" && parts[2] && parts[3] === "status" && req.method === "PATCH") {
      const body = await readBody(req);
      await pool.query(
        `UPDATE leave_requests SET status=?, reviewed_by=?, reviewed_at=?, rejection_reason=? WHERE id=?`,
        [body.request.status, body.request.reviewedBy, body.request.reviewedAt, body.request.rejectionReason, parts[2]],
      );
      if (body.balance) {
        await pool.query(
          `UPDATE leave_balances SET casual=?, sick=?, privilege=? WHERE employee_id=?`,
          [body.balance.casual, body.balance.sick, body.balance.privilege, body.balance.employeeId],
        );
      }
      send(res, 200, { ok: true }, headers);
      return;
    }

    if (parts[1] === "attendance" && req.method === "PUT") {
      const record = await readBody(req);
      await upsertAttendance(record);
      send(res, 200, record, headers);
      return;
    }

    if (parts[1] === "announcements" && req.method === "POST") {
      const item = await readBody(req);
      await pool.query(
        `INSERT INTO announcements (id, title, description, audience, department_id, publish_date, status, created_by)
         VALUES (?,?,?,?,?,?,?,?)`,
        [item.id, item.title, item.description, item.audience, item.departmentId, item.publishDate, item.status, item.createdBy],
      );
      send(res, 200, item, headers);
      return;
    }

    if (parts[1] === "announcements" && parts[2] && req.method === "PATCH") {
      const item = await readBody(req);
      await pool.query(
        `UPDATE announcements SET title=?, description=?, audience=?, department_id=?, publish_date=?, status=? WHERE id=?`,
        [item.title, item.description, item.audience, item.departmentId, item.publishDate, item.status, parts[2]],
      );
      send(res, 200, { ok: true }, headers);
      return;
    }

    if (parts[1] === "documents" && req.method === "POST") {
      const item = await readBody(req);
      await pool.query(
        `INSERT INTO documents (id, employee_id, type, name, file_name, expiry_date, status, uploaded_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [item.id, item.employeeId, item.type, item.name, item.fileName, item.expiryDate, item.status, item.uploadedAt],
      );
      send(res, 200, item, headers);
      return;
    }

    if (parts[1] === "notifications" && parts[2] === "read-all" && req.method === "POST") {
      const body = await readBody(req);
      await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [body.userId]);
      send(res, 200, { ok: true }, headers);
      return;
    }

    if (parts[1] === "notifications" && parts[2] && req.method === "PATCH") {
      await pool.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [parts[2]]);
      send(res, 200, { ok: true }, headers);
      return;
    }

    if (parts[1] === "settings" && req.method === "PATCH") {
      const settings = await readBody(req);
      await pool.query(
        "INSERT INTO settings (id, payload) VALUES (1, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload)",
        [json(settings)],
      );
      send(res, 200, settings, headers);
      return;
    }

    send(res, 404, { error: "Not found" }, headers);
  } catch (error) {
    console.error(error);
    send(res, 500, { error: error instanceof Error ? error.message : "Server error" }, headers);
  }
}

async function start() {
  if (!config.password) {
    console.error("DB_PASSWORD is required.");
    process.exit(1);
  }
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  pool = await mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 8,
    multipleStatements: true,
  });
  await pool.query(schema);
  const server = http.createServer(handle);
  server.listen(PORT, () => {
    console.log(`WCH HRMS API listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
