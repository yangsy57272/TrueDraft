import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProfile, saveProfile } from "@/server/services/profile";
import { grantConsent } from "@/server/services/consent";
import { getUserFromHeaders } from "@/server/session";
import { preparePlanningRun, executePlanningRun } from "@/server/ai/planning";
import { POST as grantRoute } from "@/app/api/consent/route";
import { DELETE as removeAccount } from "@/app/api/account/route";
import { GET, PUT } from "@/app/api/settings/ai/route";
import { POST as probe } from "@/app/api/settings/ai/test/route";
import { getAiConnection, normalizeAiUrl } from "@/server/ai/connection-settings";
import { getPolicyVersion, getPrivacyFacts } from "@/config/deployment";
import { getProvider } from "@/server/ai/provider";
import { decryptJson } from "@/server/crypto";
import { json, signIn } from "../helpers/http";

let directory: string;
let owner: { cookie: string };
let other: { cookie: string };
const origin = "http://127.0.0.1:9876";
const input = { provider: "openai-compatible", baseUrl: "https://ai.example/v1", model: "model-a", apiKey: "test-secret-key", noKey: false };
const request = (method: string, body?: unknown, cookie = owner.cookie, site = origin) => new Request(`${origin}/api/settings/ai`, {
  method, headers: { cookie, origin: site, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}),
});
const call = (method: string, body?: unknown, cookie?: string, site?: string) => (method === "GET" ? GET : PUT)(request(method, body, cookie, site), undefined as never);
beforeEach(async () => {
  owner = await signIn("device-owner@example.test"); other = await signIn("other@example.test");
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "td-ai-settings-"));
  for (const [key, value] of Object.entries({ TRUEDRAFT_DESKTOP: "1", HOSTNAME: "127.0.0.1", APP_URL: origin, BETTER_AUTH_URL: origin,
    EMAIL_TRANSPORT: "file", TRUEDRAFT_MAILBOX_DIR: directory, TRUEDRAFT_DESKTOP_TOKEN: "x".repeat(32), TRUEDRAFT_DESKTOP_EMAIL: "device-owner@example.test",
    TRUEDRAFT_AI_SETTINGS_PATH: path.join(directory, "ai-connection.enc") })) vi.stubEnv(key, value);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); fs.rmSync(directory, { recursive: true, force: true }); });

describe("desktop AI settings", () => {
  it("requires sign-in, the desktop owner and same-origin writes; hosted users cannot change global AI", async () => {
    expect((await call("GET", undefined, "")).status).toBe(401);
    expect((await call("GET", undefined, other.cookie)).status).toBe(403);
    expect((await call("PUT", input, undefined, "https://attacker.example")).status).toBe(403);
    vi.stubEnv("TRUEDRAFT_DESKTOP", "");
    expect((await call("PUT", input)).status).toBe(403);
  });
  it("encrypts credentials, hides them in responses, persists them and activates immediately", async () => {
    const policy = getPolicyVersion();
    const response = await call("PUT", input);
    expect(response.status).toBe(200);
    expect(JSON.stringify(await json(response))).not.toContain(input.apiKey);
    const ciphertext = fs.readFileSync(process.env.TRUEDRAFT_AI_SETTINGS_PATH!, "utf8");
    expect(ciphertext).not.toContain(input.apiKey);
    expect(decryptJson<{ apiKey: string }>(ciphertext, "ai_configuration").apiKey).toBe(input.apiKey);
    expect(getPrivacyFacts()).toMatchObject({ aiConfigured: true, providerNoTrainingConfirmed: false });
    expect(getPolicyVersion()).not.toBe(policy);
    expect((await getProvider()).model).toBe("model-a");
    expect(getAiConnection().apiKey).toBe(input.apiKey);
    expect(JSON.stringify(await json(await call("GET")))).not.toContain(input.apiKey);
    expect((await call("PUT", { ...input, apiKey: "", model: "model-b" })).status).toBe(200);
    expect(getAiConnection().apiKey).toBe(input.apiKey);
    expect((await getProvider()).model).toBe("model-b");
  });
  it("does not reuse a saved key for another destination; supports no-key LAN servers and explicit AI off", async () => {
    await call("PUT", input);
    const changed = await call("PUT", { ...input, baseUrl: "https://different.example/v1", apiKey: "" });
    expect((await json(changed)).error.code).toBe("ai_key_required");
    expect((await call("PUT", { ...input, baseUrl: "http://192.168.3.113:8088/#/", apiKey: "", noKey: true })).status).toBe(200);
    expect(getAiConnection()).toMatchObject({ baseUrl: "http://192.168.3.113:8088/v1", apiKey: "", noKey: true });
    expect((await call("PUT", { provider: "none" })).status).toBe(200);
    expect(getPrivacyFacts().aiConfigured).toBe(false);
  });
  it("fails closed for damaged settings and normalizes addresses without accepting credentials in URLs", async () => {
    fs.writeFileSync(process.env.TRUEDRAFT_AI_SETTINGS_PATH!, "corrupt");
    expect(getPrivacyFacts().aiConfigured).toBe(false);
    expect((await json(await call("GET"))).connection.loadError).toBe(true);
    expect(normalizeAiUrl("192.168.3.113:8088", "openai-compatible")).toBe("http://192.168.3.113:8088/v1");
    expect(normalizeAiUrl("https://api.example/v1/chat/completions", "openai-compatible")).toBe("https://api.example/v1");
    expect(() => normalizeAiUrl("https://user:pass@api.example", "openai-compatible")).toThrow();
    expect(() => normalizeAiUrl("http://public.example", "openai-compatible")).toThrow();
    expect(() => normalizeAiUrl("file:///etc/passwd", "openai-compatible")).toThrow();
  });
  it("loads model names and tests structured output without personal data or persisting unsaved settings", async () => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      if (init?.method !== "POST") return Response.json({ data: [{ id: "model-b" }, { id: "model-a" }] });
      return new Response(`data: ${JSON.stringify({ model: "model-a", choices: [{ delta: { content: '{"ok":true}' }, finish_reason: "stop" }] })}\n\n`);
    });
    vi.stubGlobal("fetch", fetcher);
    const models = await json(await probe(request("POST", { ...input, action: "models" }), undefined as never));
    expect(models.models).toEqual(["model-a", "model-b"]);
    const tested = await probe(request("POST", { ...input, action: "test" }), undefined as never);
    expect((await json(tested)).connected).toBe(true);
    expect(fetcher.mock.calls[0][0]).toBe("https://ai.example/v1/models");
    const body = JSON.parse(String(fetcher.mock.calls[1][1]?.body));
    expect(body.messages[1].content).toBe("Test connection. No personal data.");
    expect(fs.existsSync(process.env.TRUEDRAFT_AI_SETTINGS_PATH!)).toBe(false);
  });
  it("rejects stale consent dialogs and prepared runs after a service change", async () => {
    await call("PUT", input);
    const user = (await getUserFromHeaders(new Headers({ cookie: owner.cookie })))!;
    await saveProfile(user.id, { ...await getProfile(user.id), interests: "Robotics and engineering" });
    await grantConsent(user.id, "ai_processing");
    const oldPolicy = getPolicyVersion();
    // Saving the same values should not ask the user to consent again.
    await call("PUT", { ...input, apiKey: "" });
    expect(getPolicyVersion()).toBe(oldPolicy);
    const prepared = await preparePlanningRun(user, "major_explorer", {});
    await call("PUT", { ...input, model: "another-model" });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(executePlanningRun(prepared, () => {})).rejects.toMatchObject({ code: "consent_required" });
    expect(fetcher).not.toHaveBeenCalled();
    const staleGrant = await grantRoute(request("POST", { consentType: "ai_processing", action: "grant", policyVersion: oldPolicy }), undefined as never);
    expect(staleGrant.status).toBe(409);
  });
  it("removes the saved device key when its owner deletes the account", async () => {
    await call("PUT", input);
    const response = await removeAccount(request("DELETE", { confirm: "DELETE" }), undefined as never);
    expect(response.status).toBe(200);
    expect(getAiConnection()).toMatchObject({ provider: "none", apiKey: "" });
  });
  it("returns safe errors without echoing keys or upstream bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(`secret=${input.apiKey}`, { status: 401 })));
    const res = await probe(request("POST", { ...input, action: "models" }), undefined as never);
    const data = await json(res);
    expect(data.error.code).toBe("ai_key_rejected");
    expect(JSON.stringify(data)).not.toContain(input.apiKey);
  });
});
