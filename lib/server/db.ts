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
