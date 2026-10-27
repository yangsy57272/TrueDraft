import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { TEST_ENV } from "./env";

export default async function setup() {
  const pool = new Pool({ connectionString: TEST_ENV.DATABASE_URL });
  await pool.query("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
}
