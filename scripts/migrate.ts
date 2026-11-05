import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDb, getDb } from "../src/db";
import { encryptLegacyVersionNotes } from "../src/server/services/essays";

async function main() {
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
  // Data step that SQL can't do: encrypt version notes stored before notes were encrypted.
  const notes = await encryptLegacyVersionNotes();
  if (notes) console.log(`Encrypted ${notes} legacy version notes.`);
  await closeDb();
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
