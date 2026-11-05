import { assertProductionConfig } from "./config/production-guard";

/** Node.js-only startup checks: exit before serving if production is misconfigured. */
export function checkStartupConfig() {
  try {
    const warnings = assertProductionConfig();
    if (warnings.length) console.warn(`[truedraft] DEMO MODE — not for real students:\n- ${warnings.join("\n- ")}`);
  } catch (error) {
    console.error(String((error as Error).message));
    process.exit(1);
  }
}
