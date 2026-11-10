import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { closeDb } from "../src/db";
import { supplementFileSchema } from "../src/lib/supplements";
import { importSupplements } from "../src/server/services/import-supplements";

const cycle = process.argv[2] ?? "2026-2027";
try {
  const file = path.join(process.cwd(), "data", "supplements", `${cycle}.json`);
  const doc = supplementFileSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  if (doc.cycle !== cycle) throw new Error("Supplement file cycle does not match the requested cycle.");
  const { imported, missing } = importSupplements(doc);
  console.log(`Imported ${imported} schools for ${cycle}.`);
  if (missing.length) throw new Error(`Run scorecard:import first. Missing schools: ${missing.join(", ")}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Supplement import failed.");
  process.exitCode = 1;
} finally {
  closeDb();
}
