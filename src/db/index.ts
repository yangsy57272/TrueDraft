import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __tdPool?: Pool; __tdDb?: Database };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined,
  });
}

export function getDb(): Database {
  if (!globalForDb.__tdDb) {
    globalForDb.__tdPool = createPool();
    globalForDb.__tdDb = drizzle(globalForDb.__tdPool, { schema });
  }
  return globalForDb.__tdDb;
}

/** Lazily-initialised database handle so importing modules never requires a live connection. */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export async function closeDb() {
  await globalForDb.__tdPool?.end();
  globalForDb.__tdPool = undefined;
  globalForDb.__tdDb = undefined;
}

export { schema };
