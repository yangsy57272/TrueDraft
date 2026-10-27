const sentLinks = (globalThis as unknown as { __tdTest: { sentLinks: Map<string, string> } }).__tdTest.sentLinks;

export const BASE = "http://localhost:3000";

/** Sign in through the real Better Auth magic-link flow and return the session cookie header. */
export async function signIn(email: string, locale?: string): Promise<{ cookie: string; userId: string }> {
  const { auth } = await import("@/server/auth");
  const headers: Record<string, string> = { "content-type": "application/json", origin: BASE };
  if (locale) headers.cookie = `td_locale=${locale}`;
  const res = await auth.handler(
    new Request(`${BASE}/api/auth/sign-in/magic-link`, { method: "POST", headers, body: JSON.stringify({ email, callbackURL: "/dashboard" }) }),
  );
  if (res.status !== 200) throw new Error(`magic link request failed: ${res.status}`);
  const link = sentLinks.get(email.toLowerCase());
  if (!link) throw new Error("no magic link captured");
  const verify = await auth.handler(new Request(link, { headers: locale ? { cookie: `td_locale=${locale}` } : {} }));
  const setCookie = verify.headers.getSetCookie().find((c) => c.includes("session_token"));
  if (!setCookie) throw new Error(`no session cookie (status ${verify.status})`);
  const cookie = setCookie.split(";")[0];
  const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
  return { cookie, userId: session!.user.id };
}

export function req(method: string, path: string, opts: { cookie?: string; body?: unknown; origin?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET") headers.origin = opts.origin ?? BASE;
  return new Request(`${BASE}${path}`, { method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
}

export const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

export async function json(res: Response) {
  return res.json() as Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Read an NDJSON AI stream to completion. */
export async function readStream(res: Response) {
  const text = await res.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

export const sampleEssay = {
  title: "Test essay",
  applicationType: "personal_statement",
  promptText: "Describe a topic that makes you lose track of time.",
  wordLimit: 650,
  draft: "I map the night market every Saturday. People walk in loops near the tea stall.",
  feedbackLanguage: "en",
  focusAreas: ["structure", "reflection"],
  context: null,
};
