import dns from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";
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

function tcpOpen(host: string, port: number, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ host, port, family: host.includes(":") ? 6 : 4 });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

async function ipv6ForName(name: string) {
  try {
    const records = await dns.lookup(name, { all: true });
    return records.find((record) => record.family === 6)?.address ?? "";
  } catch {
    return "";
  }
}

async function resolveDbHost(host: string, port: number) {
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return host;
  }
  const ipv6 = await ipv6ForName(host);
  if (ipv6) return ipv6;
  // An IPv4 literal, or a name with no IPv6 record. The Hostinger IPv4 address
  // drops packets from outside the network, so use the hostname's IPv6 when it
  // matches this address.
  const candidate = host;
  if (!(await tcpOpen(candidate, port, 2000))) {
    const hostname = "srv1750.hstgr.io";
    try {
      const addresses = await dns.resolve4(hostname);
      if (addresses.includes(candidate)) {
        const fallback = await ipv6ForName(hostname);
        if (fallback) return fallback;
      }
    } catch {
      // Keep the configured host.
    }
  }
  return candidate;
}

function isTransientDbError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : "";
  return (
    TRANSIENT_DB_CODES.has(code) ||
    message.includes("ENOTFOUND") ||
    message.includes("EAI_AGAIN") ||
    message.includes("ETIMEDOUT") ||
    message.includes("Pool is closed")
  );
}

let pool: Pool | null = null;
let poolHost = "";
let schemaReady = false;

async function resetPool() {
  const current = pool;
  pool = null;
  poolHost = "";
  schemaReady = false;
  documentColumnsReady = false;
  leaveColumnsReady = false;
  lateRemovalTableReady = false;
  employeeScheduleColumnsReady = false;
  projectsTableReady = false;
  projectWorkTablesReady = false;
  passwordPlainColumnReady = false;
  if (current) {
    await current.end().catch(() => undefined);
  }
}

export async function getPool(): Promise<Pool> {
  const config = dbConfig();
  if (!config.password) {
    throw new Error("DB_PASSWORD is required.");
  }
  const host = await resolveDbHost(String(config.host || "localhost"), Number(config.port || 3306));
  if (pool && poolHost !== host) {
    await resetPool();
  }
  if (!pool) {
    poolHost = host;
    pool = mysql.createPool({
      ...config,
      host,
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
    await ensurePasswordPlainColumn(pool);
    await ensureUserPreferenceColumns(pool);
    await ensureLeaveBalanceYearColumn(pool);
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
let projectWorkTablesReady = false;

export async function ensureProjectsTable(db?: Pool) {
  if (projectsTableReady && projectWorkTablesReady) return;
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
      overview TEXT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'UPCOMING',
      requirement_ids LONGTEXT NULL,
      completed_requirement_ids LONGTEXT NULL,
      project_manager_id VARCHAR(64) NULL,
      team_member_ids LONGTEXT NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      updated_at VARCHAR(64) NOT NULL,
      UNIQUE KEY projects_serial_no (serial_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [columns] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects'`,
  );
  const names = new Set(columns.map((row) => String(row.COLUMN_NAME)));
  if (!names.has("overview")) {
    await pool.query("ALTER TABLE projects ADD COLUMN overview TEXT NULL");
  }
  if (!names.has("status")) {
    await pool.query("ALTER TABLE projects ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'UPCOMING'");
    await pool.query("UPDATE projects SET status = 'ONGOING'");
  }
  if (!names.has("requirement_ids")) {
    await pool.query("ALTER TABLE projects ADD COLUMN requirement_ids LONGTEXT NULL");
  }
  if (!names.has("completed_requirement_ids")) {
    await pool.query("ALTER TABLE projects ADD COLUMN completed_requirement_ids LONGTEXT NULL");
  }
  projectsTableReady = true;
  if (projectWorkTablesReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_tasks (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      parent_id VARCHAR(64) NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(32) NOT NULL,
      priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
      assignee_id VARCHAR(64) NULL,
      start_date DATE NULL,
      end_date DATE NULL,
      duration_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      created_by VARCHAR(64) NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      updated_at VARCHAR(64) NOT NULL,
      KEY project_tasks_project (project_id),
      KEY project_tasks_parent (parent_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_task_comments (
      id VARCHAR(64) PRIMARY KEY,
      task_id VARCHAR(64) NOT NULL,
      author_id VARCHAR(64) NOT NULL,
      body TEXT NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      KEY project_task_comments_task (task_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_task_time (
      id VARCHAR(64) PRIMARY KEY,
      task_id VARCHAR(64) NOT NULL,
      employee_id VARCHAR(64) NOT NULL,
      hours DECIMAL(8,2) NOT NULL,
      note VARCHAR(500) NOT NULL DEFAULT '',
      created_at VARCHAR(64) NOT NULL,
      KEY project_task_time_task (task_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_task_images (
      id VARCHAR(64) PRIMARY KEY,
      task_id VARCHAR(64) NOT NULL,
      comment_id VARCHAR(64) NULL,
      file_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(128) NOT NULL,
      file_data LONGBLOB NOT NULL,
      uploaded_by VARCHAR(64) NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      KEY project_task_images_task (task_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [taskColumns] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_tasks'`,
  );
  const taskNames = new Set(taskColumns.map((row) => String(row.COLUMN_NAME)));
  if (!taskNames.has("assignee_ids")) {
    await pool.query("ALTER TABLE project_tasks ADD COLUMN assignee_ids LONGTEXT NULL");
    await pool.query(
      `UPDATE project_tasks
       SET assignee_ids = JSON_ARRAY(assignee_id)
       WHERE assignee_id IS NOT NULL AND assignee_id <> ''`,
    );
  }
  if (!taskNames.has("task_no")) {
    await pool.query("ALTER TABLE project_tasks ADD COLUMN task_no INT NOT NULL DEFAULT 0");
  }
  const [unnumbered] = await pool.query<RowDataPacket[]>(
    "SELECT id, project_id, parent_id FROM project_tasks WHERE task_no = 0 ORDER BY created_at ASC, id ASC",
  );
  if (unnumbered.length > 0) {
    const [maxRows] = await pool.query<RowDataPacket[]>(
      `SELECT project_id, parent_id, MAX(task_no) AS max_no
       FROM project_tasks
       WHERE task_no > 0
       GROUP BY project_id, parent_id`,
    );
    const maxes = new Map<string, number>();
    for (const row of maxRows) {
      maxes.set(`${row.project_id}\0${row.parent_id ?? ""}`, Number(row.max_no) || 0);
    }
    for (const row of unnumbered) {
      const key = `${row.project_id}\0${row.parent_id ?? ""}`;
      const next = (maxes.get(key) ?? 0) + 1;
      maxes.set(key, next);
      await pool.query("UPDATE project_tasks SET task_no = ? WHERE id = ? AND task_no = 0", [next, row.id]);
    }
  }
  const [timeColumns] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_task_time'`,
  );
  const timeMeta = new Map(timeColumns.map((row) => [String(row.COLUMN_NAME), String(row.IS_NULLABLE)]));
  if (!timeMeta.has("work_date")) {
    await pool.query("ALTER TABLE project_task_time ADD COLUMN work_date DATE NULL");
  }
  await pool.query(
    `UPDATE project_task_time
     SET work_date = LEFT(created_at, 10)
     WHERE work_date IS NULL AND created_at REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}'`,
  );
  if (!timeMeta.has("project_id")) {
    await pool.query("ALTER TABLE project_task_time ADD COLUMN project_id VARCHAR(64) NULL");
  }
  await pool.query(
    `UPDATE project_task_time t
     INNER JOIN project_tasks k ON k.id = t.task_id
     SET t.project_id = k.project_id
     WHERE t.project_id IS NULL AND t.task_id IS NOT NULL`,
  );
  if (timeMeta.get("task_id") === "NO") {
    await pool.query("ALTER TABLE project_task_time MODIFY task_id VARCHAR(64) NULL");
  }
  projectWorkTablesReady = true;
}

let passwordPlainColumnReady = false;

export async function ensurePasswordPlainColumn(db?: Pool) {
  if (passwordPlainColumnReady) return;
  const pool = db ?? (await getPool());
  const [columns] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
  );
  const names = new Set(columns.map((row) => String(row.COLUMN_NAME)));
  if (!names.has("password_plain")) {
    await pool.query("ALTER TABLE users ADD COLUMN password_plain VARCHAR(255) NOT NULL DEFAULT ''");
  }
  passwordPlainColumnReady = true;
}

let userPreferenceColumnsReady = false;

export async function ensureUserPreferenceColumns(db?: Pool) {
  if (userPreferenceColumnsReady) return;
  const pool = db ?? (await getPool());
  const [columns] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
  );
  const names = new Set(columns.map((row) => String(row.COLUMN_NAME)));
  if (!names.has("color_theme")) {
    await pool.query("ALTER TABLE users ADD COLUMN color_theme VARCHAR(32) NOT NULL DEFAULT 'atlantic'");
  }
  if (!names.has("appearance")) {
    await pool.query("ALTER TABLE users ADD COLUMN appearance VARCHAR(16) NOT NULL DEFAULT 'light'");
  }
  userPreferenceColumnsReady = true;
}

let leaveBalanceYearReady = false;

export async function ensureLeaveBalanceYearColumn(db?: Pool) {
  if (leaveBalanceYearReady) return;
  const pool = db ?? (await getPool());
  const [columns] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leave_balances'`,
  );
  const names = new Set(columns.map((row) => String(row.COLUMN_NAME)));
  if (!names.has("year_start")) {
    await pool.query("ALTER TABLE leave_balances ADD COLUMN year_start DATE NULL");
  }
  if (!names.has("spent_casual")) {
    await pool.query("ALTER TABLE leave_balances ADD COLUMN spent_casual DECIMAL(6,1) NOT NULL DEFAULT 0");
  }
  if (!names.has("spent_sick")) {
    await pool.query("ALTER TABLE leave_balances ADD COLUMN spent_sick DECIMAL(6,1) NOT NULL DEFAULT 0");
  }
  if (!names.has("spent_privilege")) {
    await pool.query("ALTER TABLE leave_balances ADD COLUMN spent_privilege DECIMAL(6,1) NOT NULL DEFAULT 0");
  }
  leaveBalanceYearReady = true;
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
