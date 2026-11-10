import { mkdirSync } from "node:fs";
import path from "node:path";
import DatabaseDriver from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type Database = BetterSQLite3Database<typeof schema> & { $client: DatabaseDriver.Database };

const globalForDb = globalThis as unknown as { __tdSqlite?: DatabaseDriver.Database; __tdDb?: Database };

export function getDb(): Database {
  if (!globalForDb.__tdDb) {
    const configuredPath = process.env.DATABASE_PATH;
    if (!configuredPath && process.env.DATABASE_URL) {
      throw new Error("Set DATABASE_PATH for SQLite. See the PostgreSQL import instructions in docs/DEPLOYMENT.md.");
    }
    const file = configuredPath === ":memory:" ? configuredPath : path.resolve(/* turbopackIgnore: true */ configuredPath || ".truedraft/truedraft.sqlite");
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const sqlite = new DatabaseDriver(file, { timeout: 5000 });
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    globalForDb.__tdSqlite = sqlite;
    globalForDb.__tdDb = drizzle(sqlite, { schema });
  }
  return globalForDb.__tdDb;
}

/** Lazily initialise so building the site never requires a database. */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export function closeDb() {
  globalForDb.__tdSqlite?.close();
  globalForDb.__tdSqlite = undefined;
  globalForDb.__tdDb = undefined;
}

export function isUniqueViolation(error: unknown) {
  const wrapped = error as { code?: string; cause?: { code?: string } };
  const code = wrapped?.cause?.code ?? wrapped?.code;
  return code === "SQLITE_CONSTRAINT_UNIQUE" || code === "SQLITE_CONSTRAINT_PRIMARYKEY";
}
