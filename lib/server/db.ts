import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import mysql, { type Pool, type PoolOptions, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

function env(name: string, fallback = "") {
  return process.env[name] ?? fallback;
}

const TRANSIENT_DB_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
]);

export function dbConfig(): PoolOptions {
  return {
    host: env("DB_HOST", "localhost"),
    port: Number(env("DB_PORT", "3306")),
    user: env("DB_USER", "u572425523_hrmswch"),
    password: env("DB_PASSWORD"),
    database: env("DB_NAME", "u572425523_hrmswch"),
    waitForConnections: true,
    connectionLimit: 8,
    multipleStatements: true,
    enableKeepAlive: true,
    connectTimeout: 15_000,
    dateStrings: true,
  };
}

async function resolveDbHost(host: string) {
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return host;
  }
  try {
    const { address } = await dns.lookup(host, { family: 4 });
    return address;
  } catch {
    return host;
  }
}

function isTransientDbError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : "";
  return TRANSIENT_DB_CODES.has(code) || message.includes("ENOTFOUND") || message.includes("EAI_AGAIN");
}

let pool: Pool | null = null;
let schemaReady = false;

async function resetPool() {
  const current = pool;
  pool = null;
  schemaReady = false;
  documentColumnsReady = false;
  leaveColumnsReady = false;
  lateRemovalTableReady = false;
  employeeScheduleColumnsReady = false;
  projectsTableReady = false;
  if (current) {
    await current.end().catch(() => undefined);
  }
}

export async function getPool(): Promise<Pool> {
  const config = dbConfig();
  if (!config.password) {
    throw new Error("DB_PASSWORD is required.");
  }
  if (!pool) {
    pool = mysql.createPool({
      ...config,
      host: await resolveDbHost(String(config.host || "localhost")),
    });
  }
  if (!schemaReady) {
    const schema = fs.readFileSync(path.join(process.cwd(), "backend/schema.sql"), "utf8");
    await pool.query(schema);
    await ensureDocumentFileColumns(pool);
    await ensureLeaveAttachmentColumns(pool);
    await ensureLateRemovalTable(pool);
    await ensureEmployeeScheduleColumns(pool);
    await ensureProjectsTable(pool);
    schemaReady = true;
  }
  return pool;
}

async function withDb<T>(run: (db: Pool) => Promise<T>): Promise<T> {
  try {
    return await run(await getPool());
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    await resetPool();
    return run(await getPool());
  }
}

let documentColumnsReady = false;

export async function ensureDocumentFileColumns(db?: Pool) {
  if (documentColumnsReady) return;
  const pool = db ?? (await getPool());
  const [columns] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents'`,
  );
  const names = new Set(columns.map((row) => String(row.COLUMN_NAME)));
  if (!names.has("mime_type")) {
    await pool.query("ALTER TABLE documents ADD COLUMN mime_type VARCHAR(128) NULL");
  }
  if (!names.has("file_data")) {
    await pool.query("ALTER TABLE documents ADD COLUMN file_data LONGBLOB NULL");
  }
  documentColumnsReady = true;
}

let leaveColumnsReady = false;

export async function ensureLeaveAttachmentColumns(db?: Pool) {
  if (leaveColumnsReady) return;
  const pool = db ?? (await getPool());
  const [columns] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leave_requests'`,
  );
  const names = new Set(columns.map((row) => String(row.COLUMN_NAME)));
  if (!names.has("attachment_mime")) {
    await pool.query("ALTER TABLE leave_requests ADD COLUMN attachment_mime VARCHAR(128) NULL");
  }
  if (!names.has("attachment_data")) {
    await pool.query("ALTER TABLE leave_requests ADD COLUMN attachment_data LONGBLOB NULL");
  }
  leaveColumnsReady = true;
}

let lateRemovalTableReady = false;

export async function ensureLateRemovalTable(db?: Pool) {
  if (lateRemovalTableReady) return;
  const pool = db ?? (await getPool());
  await pool.query(`
    CREATE TABLE IF NOT EXISTS late_removal_requests (
      id VARCHAR(64) PRIMARY KEY,
      employee_id VARCHAR(64) NOT NULL,
      attendance_id VARCHAR(64) NOT NULL,
      attendance_date DATE NOT NULL,
      late_minutes INT NOT NULL DEFAULT 0,
      active_working_minutes INT NOT NULL DEFAULT 0,
      required_hours DECIMAL(4,1) NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(32) NOT NULL,
      rejection_reason TEXT NULL,
      reviewed_by VARCHAR(64) NULL,
      reviewed_at VARCHAR(64) NULL,
      created_at VARCHAR(64) NOT NULL,
      UNIQUE KEY late_removal_attendance (attendance_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  lateRemovalTableReady = true;
}

let employeeScheduleColumnsReady = false;

export async function ensureEmployeeScheduleColumns(db?: Pool) {
  if (employeeScheduleColumnsReady) return;
  const pool = db ?? (await getPool());
  const [columns] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees'`,
  );
  const names = new Set(columns.map((row) => String(row.COLUMN_NAME)));
  if (!names.has("work_start_time")) {
    await pool.query("ALTER TABLE employees ADD COLUMN work_start_time VARCHAR(8) NOT NULL DEFAULT '09:30'");
  }
  if (!names.has("late_after_minutes")) {
    await pool.query("ALTER TABLE employees ADD COLUMN late_after_minutes INT NOT NULL DEFAULT 10");
  }
  employeeScheduleColumnsReady = true;
}

let projectsTableReady = false;

export async function ensureProjectsTable(db?: Pool) {
  if (projectsTableReady) return;
  const pool = db ?? (await getPool());
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(64) PRIMARY KEY,
      serial_no INT NOT NULL,
      website_name VARCHAR(255) NOT NULL,
      website_url TEXT NOT NULL,
      login_username VARCHAR(255) NOT NULL DEFAULT '',
      login_password VARCHAR(255) NOT NULL DEFAULT '',
      technology_used TEXT NOT NULL,
      figma_link TEXT NOT NULL,
      remark TEXT NOT NULL,
      project_manager_id VARCHAR(64) NULL,
      team_member_ids LONGTEXT NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      updated_at VARCHAR(64) NOT NULL,
      UNIQUE KEY projects_serial_no (serial_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  projectsTableReady = true;
}

export async function query<T extends RowDataPacket>(sql: string, params: unknown[] = []) {
  return withDb(async (db) => {
    const [rows] = await db.query<T[]>(sql, params);
    return rows;
  });
}

export async function execute(sql: string, params: unknown[] = []) {
  return withDb(async (db) => {
    const [result] = await db.query<ResultSetHeader>(sql, params);
    return result;
  });
}
