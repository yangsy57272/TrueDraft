/** Runs once when the server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkStartupConfig } = await import("./instrumentation-node");
    checkStartupConfig();
  }
}
