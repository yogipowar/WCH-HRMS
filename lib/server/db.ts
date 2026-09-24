import fs from "node:fs";
import path from "node:path";
import mysql, { type Pool, type PoolOptions, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

function env(name: string, fallback = "") {
  return process.env[name] ?? fallback;
}

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

let pool: Pool | null = null;
let schemaReady = false;

export async function getPool(): Promise<Pool> {
  const config = dbConfig();
  if (!config.password) {
    throw new Error("DB_PASSWORD is required.");
  }
  if (!pool) {
    pool = mysql.createPool(config);
  }
  if (!schemaReady) {
    const schema = fs.readFileSync(path.join(process.cwd(), "backend/schema.sql"), "utf8");
    await pool.query(schema);
    schemaReady = true;
  }
  return pool;
}

export async function query<T extends RowDataPacket>(sql: string, params: unknown[] = []) {
  const db = await getPool();
  const [rows] = await db.query<T[]>(sql, params);
  return rows;
}

export async function execute(sql: string, params: unknown[] = []) {
  const db = await getPool();
  const [result] = await db.query<ResultSetHeader>(sql, params);
  return result;
}
