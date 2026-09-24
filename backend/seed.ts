import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { loadEnv } from "./load-env.mjs";
import { createSeedData } from "../data/mock-data";

loadEnv();

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "u572425523_hrmswch",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "u572425523_hrmswch",
  multipleStatements: true,
};

function json(value: unknown) {
  return value == null ? null : JSON.stringify(value);
}

async function seed() {
  if (!config.password) {
    throw new Error("DB_PASSWORD is required.");
  }

  const schema = fs.readFileSync(path.join(process.cwd(), "backend/schema.sql"), "utf8");
  const connection = await mysql.createConnection(config);
  await connection.query(schema);

  const data = createSeedData();

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of [
    "users",
    "employees",
    "departments",
    "designations",
    "attendance_records",
    "leave_balances",
    "leave_requests",
    "holidays",
    "notifications",
    "announcements",
    "documents",
    "payroll_records",
    "settings",
  ]) {
    await connection.query(`DELETE FROM ${table}`);
  }

  for (const user of data.users) {
    await connection.query(
      `INSERT INTO users (id, name, email, phone, role, employee_id, avatar_url, username, password_hash)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        user.id,
        user.name,
        user.email,
        user.phone,
        user.role,
        user.employeeId,
        user.avatarUrl,
        user.username,
        await bcrypt.hash(user.password, 10),
      ],
    );
  }

  for (const employee of data.employees) {
    await connection.query(
      `INSERT INTO employees (
        id, employee_code, user_id, full_name, avatar_url, date_of_birth, gender, phone,
        personal_email, work_email, address, department_id, designation_id, joining_date,
        employment_type, reporting_person_id, work_location, status, daily_required_hours,
        basic_salary, allowances, deductions, emergency_contact, bank_information
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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

  for (const item of data.departments) {
    await connection.query(
      `INSERT INTO departments (id, name, head_employee_id, status, created_at, description) VALUES (?,?,?,?,?,?)`,
      [item.id, item.name, item.headEmployeeId, item.status, item.createdAt, item.description],
    );
  }

  for (const item of data.designations) {
    await connection.query(
      `INSERT INTO designations (id, name, department_id, status) VALUES (?,?,?,?)`,
      [item.id, item.name, item.departmentId, item.status],
    );
  }

  for (const item of data.attendanceRecords) {
    await connection.query(
      `INSERT INTO attendance_records (
        id, employee_id, date, clock_in, clock_out, state, status, required_hours,
        active_working_minutes, break_minutes, work_session, breaks_json, late_minutes, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        item.id,
        item.employeeId,
        item.date,
        item.clockIn,
        item.clockOut,
        item.state,
        item.status,
        item.requiredHours,
        item.activeWorkingMinutes,
        item.breakMinutes,
        json(item.workSession),
        json(item.breaks),
        item.lateMinutes,
        item.notes,
      ],
    );
  }

  for (const item of data.leaveBalances) {
    await connection.query(
      `INSERT INTO leave_balances (employee_id, casual, sick, privilege) VALUES (?,?,?,?)`,
      [item.employeeId, item.casual, item.sick, item.privilege],
    );
  }

  for (const item of data.leaveRequests) {
    await connection.query(
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
  }

  for (const item of data.holidays) {
    await connection.query(
      `INSERT INTO holidays (id, name, date, type, description, recurring) VALUES (?,?,?,?,?,?)`,
      [item.id, item.name, item.date, item.type, item.description, item.recurring ? 1 : 0],
    );
  }

  for (const item of data.notifications) {
    await connection.query(
      `INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at, href)
       VALUES (?,?,?,?,?,?,?,?)`,
      [item.id, item.userId, item.type, item.title, item.message, item.read ? 1 : 0, item.createdAt, item.href],
    );
  }

  for (const item of data.announcements) {
    await connection.query(
      `INSERT INTO announcements (id, title, description, audience, department_id, publish_date, status, created_by)
       VALUES (?,?,?,?,?,?,?,?)`,
      [item.id, item.title, item.description, item.audience, item.departmentId, item.publishDate, item.status, item.createdBy],
    );
  }

  for (const item of data.documents) {
    await connection.query(
      `INSERT INTO documents (id, employee_id, type, name, file_name, expiry_date, status, uploaded_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [item.id, item.employeeId, item.type, item.name, item.fileName, item.expiryDate, item.status, item.uploadedAt],
    );
  }

  for (const item of data.payrollRecords) {
    await connection.query(
      `INSERT INTO payroll_records (
        id, employee_id, period, basic_salary, allowances, deductions, gross_salary, net_salary, status, payslip_available
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        item.id,
        item.employeeId,
        item.period,
        item.basicSalary,
        item.allowances,
        item.deductions,
        item.grossSalary,
        item.netSalary,
        item.status,
        item.payslipAvailable ? 1 : 0,
      ],
    );
  }

  await connection.query(
    "INSERT INTO settings (id, payload) VALUES (1, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload)",
    [json(data.settings)],
  );

  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  await connection.end();
  console.log("Seeded Hostinger MySQL database.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
