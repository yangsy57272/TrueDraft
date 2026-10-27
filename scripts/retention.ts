import "dotenv/config";
import { closeDb } from "../src/db";
import { purgeExpiredEssays } from "../src/server/services/account";
import { pruneRateLimits } from "../src/server/rate-limit";

/** Enforce every user's retention preference. Schedule daily (cron, platform scheduler, etc.). */
async function main() {
  const deleted = await purgeExpiredEssays();
  await pruneRateLimits();
  console.log(`Retention run complete. Essays deleted: ${deleted}`);
  await closeDb();
}

main().catch((error) => {
  console.error("Retention run failed:", error instanceof Error ? error.name : error);
  process.exit(1);
});
