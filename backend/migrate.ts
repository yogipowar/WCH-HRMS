import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { loadEnv } from "./load-env.mjs";

loadEnv();

async function migrate() {
  const password = process.env.DB_PASSWORD;
  if (!password) {
    throw new Error("DB_PASSWORD is required.");
  }
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "u572425523_hrmswch",
    password,
    database: process.env.DB_NAME || "u572425523_hrmswch",
    multipleStatements: true,
    connectTimeout: 15_000,
  });
  const schema = fs.readFileSync(path.join(process.cwd(), "backend/schema.sql"), "utf8");
  await connection.query(schema);
  await connection.end();
  console.log("Migrated Hostinger MySQL tables.");
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
