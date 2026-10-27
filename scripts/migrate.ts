import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDb, getDb } from "../src/db";

async function main() {
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
  await closeDb();
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
