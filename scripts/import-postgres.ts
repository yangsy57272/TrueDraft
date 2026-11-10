import "dotenv/config";
import { linkSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { getTableColumns, getTableName } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { closeDb, getDb } from "../src/db";
import * as schema from "../src/db/schema";
import { encryptLegacyVersionNotes } from "../src/server/services/essays";

// Parents precede children. Auth sessions and unredeemed links must be issued afresh.
const tables = [
  schema.user, schema.account, schema.privacySettings, schema.consentRecord, schema.studentProfile,
  schema.planningRun, schema.resource, schema.school, schema.federalProfile, schema.cdsDataset,
  schema.collegeListEntry, schema.essay, schema.essayVersion, schema.feedbackRun, schema.brainstormNote,
  schema.auditEvent,
];

function quote(name: string) {
  return `"${name.replaceAll('"', '""')}"`;
}

async function main() {
  const sourceUrl = process.env.LEGACY_DATABASE_URL;
  const configuredPath = process.env.DATABASE_PATH;
  if (!sourceUrl || !configuredPath || configuredPath === ":memory:" || !process.env.ENCRYPTION_KEYS) {
    throw new Error("Set LEGACY_DATABASE_URL, a new DATABASE_PATH, and the original ENCRYPTION_KEYS.");
  }
  const target = path.resolve(configuredPath);
  mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const scratch = mkdtempSync(path.join(path.dirname(target), ".truedraft-import-"));
  const staging = path.join(scratch, "database.sqlite");
  process.env.DATABASE_PATH = staging;
  const source = new Client({ connectionString: sourceUrl });
  try {
    const db = getDb();
    migrate(db, { migrationsFolder: "./drizzle-sqlite" });
    await source.connect();
    await source.query("begin isolation level repeatable read read only");
    for (const table of tables) {
      const name = getTableName(table);
      const columns = Object.values(getTableColumns(table));
      const names = columns.map((column) => quote(column.name)).join(", ");
      const { rows } = await source.query(`select ${names} from ${quote(name)}`);
      const placeholders = columns.map(() => "?").join(", ");
      const insert = db.$client.prepare(`insert into ${quote(name)} (${names}) values (${placeholders})`);
      db.transaction(() => {
        for (const row of rows) {
          const values = columns.map((column) => row[column.name] === null ? null : column.mapToDriverValue(row[column.name]));
          insert.run(...values);
        }
      });
      console.log(`${name}: ${rows.length} rows`);
    }
    await source.query("commit");
    await encryptLegacyVersionNotes();
    if (db.$client.prepare("pragma foreign_key_check").all().length) throw new Error("SQLite foreign key check failed.");
    closeDb();
    // Publish only after the entire copy succeeds. A pre-existing destination is never replaced.
    linkSync(staging, target);
    console.log("SQLite import complete. Sign in again with your original account email.");
  } finally {
    await source.end().catch(() => {});
    closeDb();
    rmSync(scratch, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error("PostgreSQL import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
