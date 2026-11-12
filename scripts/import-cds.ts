import "dotenv/config";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { closeDb } from "../src/db";
import { importCds, type CdsCatalogEntry, type CdsFile } from "../src/server/services/import-cds";

/** Reproducible reference import. Original field-level evidence stays in data/cds/*.json. */
async function main() {
  const dir = path.join(process.cwd(), "data", "cds");
  const files = readdirSync(dir).filter(f => /^20\d{2}-20\d{2}.*\.json$/.test(f)).sort();
  const documents = files.map(filename => ({ filename, doc: JSON.parse(readFileSync(path.join(dir, filename), "utf8")) as CdsFile }));
  const catalogFile = path.join(dir, "catalog.json");
  const catalog = existsSync(catalogFile) ? (JSON.parse(readFileSync(catalogFile, "utf8")) as { schools: CdsCatalogEntry[] }).schools : [];
  const result = importCds(documents, catalog);
  for (const skip of result.skipped) console.warn(`skip ${skip.slug}: ${skip.reason}`);
  console.log(`CDS: ${result.imported} datasets imported, ${result.linksUpdated} official source links updated, ${result.preserved} operator-managed datasets preserved.`);
  await closeDb();
  if (result.skipped.length) throw new Error(`${result.skipped.length} CDS records failed validation`);
}
main().catch(error => { console.error("CDS import failed:", error instanceof Error ? error.message : error); process.exit(1); });
