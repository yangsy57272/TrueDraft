import "dotenv/config";
import { closeDb } from "../src/db";
import { purgeExpiredEssays } from "../src/server/services/account";
import { pruneRateLimits } from "../src/server/rate-limit";
import { encryptLegacyVersionNotes } from "../src/server/services/essays";
import { recoverStuckRuns } from "../src/server/ai/limits";

/** Enforce every user's retention preference. Schedule daily (cron, platform scheduler, etc.). */
async function main() {
  const deleted = await purgeExpiredEssays();
  await pruneRateLimits();
  await encryptLegacyVersionNotes();
  const stuck = await recoverStuckRuns();
  if (stuck) console.log(`Marked ${stuck} interrupted AI runs as failed.`);
  console.log(`Retention run complete. Essays deleted: ${deleted}`);
  await closeDb();
}

main().catch((error) => {
  console.error("Retention run failed:", error instanceof Error ? error.name : error);
  process.exit(1);
});
