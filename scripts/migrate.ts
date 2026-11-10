import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { supplementFileSchema } from "../src/lib/supplements";
import { importSupplements } from "../src/server/services/import-supplements";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { closeDb, getDb } from "../src/db";
import { encryptLegacyVersionNotes } from "../src/server/services/essays";

async function main() {
  migrate(getDb(), { migrationsFolder: "./drizzle-sqlite" });
  console.log("Migrations applied.");
  // Data step that SQL can't do: encrypt version notes stored before notes were encrypted.
  const notes = await encryptLegacyVersionNotes();
  if (notes) console.log(`Encrypted ${notes} legacy version notes.`);
  if (process.env.TRUEDRAFT_DESKTOP === "1") {
    const file = path.resolve("data/supplements/2026-2027.json");
    if (!existsSync(file)) throw new Error("The desktop supplement catalog is missing.");
    const { imported, missing } = importSupplements(supplementFileSchema.parse(JSON.parse(readFileSync(file, "utf8"))));
    if (missing.length) throw new Error("The school catalog must be updated before importing supplements.");
    console.log(`Updated supplements for ${imported} schools.`);
  }
  await closeDb();
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
