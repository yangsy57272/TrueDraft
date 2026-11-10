/**
 * Refuse to run a production server with development-only services.
 *
 * In production these are errors unless TRUEDRAFT_DEMO_MODE=true is set explicitly. That flag is
 * for demos and automated tests with fictional data only; it also shows a site-wide banner.
 */
type Env = Record<string, string | undefined>;

export function isDemoMode(env: Env = process.env) {
  return env.TRUEDRAFT_DEMO_MODE === "true";
}

export function isDesktopMode(env: Env = process.env) {
  const url = env.APP_URL ?? "";
  return env.TRUEDRAFT_DESKTOP === "1" && env.HOSTNAME === "127.0.0.1"
    && /^http:\/\/127\.0\.0\.1:\d+$/.test(url) && env.BETTER_AUTH_URL === url
    && env.EMAIL_TRANSPORT === "file" && Boolean(env.TRUEDRAFT_MAILBOX_DIR)
    && (env.TRUEDRAFT_DESKTOP_TOKEN?.length ?? 0) >= 32;
}

/** Problems that make a production deployment unsafe for real students. Pure; unit-tested. */
export function productionConfigProblems(env: Env = process.env): string[] {
  if (env.NODE_ENV !== "production") return [];
  const problems: string[] = [];
  const ai = (env.AI_PROVIDER ?? "").trim().toLowerCase();
  if (ai === "mock") problems.push("AI_PROVIDER=mock returns placeholder feedback");
  const email = env.EMAIL_TRANSPORT;
  const desktop = isDesktopMode(env);
  if (env.TRUEDRAFT_DESKTOP === "1" && !desktop) problems.push("Desktop mode requires a loopback server and a launcher token");
  if (email === "console" || (email === "file" && !desktop)) problems.push(`EMAIL_TRANSPORT=${email} does not deliver sign-in links`);
  if ((email === undefined || email === "smtp") && (!env.SMTP_URL || !env.EMAIL_FROM)) problems.push("SMTP_URL and EMAIL_FROM are required for email sign-in");
  if (env.AUTH_RATE_LIMIT === "off") problems.push("AUTH_RATE_LIMIT=off disables sign-in rate limiting");
  if (!env.ENCRYPTION_KEYS) problems.push("ENCRYPTION_KEYS is not set");
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) problems.push("BETTER_AUTH_SECRET must be at least 32 characters");
  const appUrl = env.APP_URL ?? env.BETTER_AUTH_URL ?? "";
  if (!desktop && !/^https:\/\//.test(appUrl) && !/^http:\/\/localhost(:\d+)?$/.test(appUrl)) problems.push("APP_URL must use https");
  return problems;
}

/** Throws with every problem listed, unless demo mode was chosen explicitly. */
export function assertProductionConfig(env: Env = process.env) {
  const problems = productionConfigProblems(env);
  if (problems.length === 0 || isDemoMode(env)) return problems;
  throw new Error(
    `Refusing to start in production:\n- ${problems.join("\n- ")}\n` +
      "Fix these, or set TRUEDRAFT_DEMO_MODE=true for a demo with fictional data only (a banner will say so).",
  );
}
