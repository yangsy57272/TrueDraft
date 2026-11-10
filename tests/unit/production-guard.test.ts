import { describe, expect, it } from "vitest";
import { assertProductionConfig, productionConfigProblems } from "@/config/production-guard";
import { costMicroUsd, inputHash } from "@/server/ai/limit-rules";

const good = {
  NODE_ENV: "production",
  AI_PROVIDER: "anthropic",
  EMAIL_TRANSPORT: "smtp",
  SMTP_URL: "smtps://user:pass@mail.example.com",
  EMAIL_FROM: "TrueDraft <no-reply@example.com>",
  ENCRYPTION_KEYS: "k1:abc",
  BETTER_AUTH_SECRET: "x".repeat(40),
  APP_URL: "https://truedraft.example.com",
};

describe("production guard", () => {
  it("accepts a real production configuration", () => {
    expect(productionConfigProblems(good)).toEqual([]);
    expect(() => assertProductionConfig(good)).not.toThrow();
  });

  it("rejects mock AI, development email transports, and disabled sign-in limits", () => {
    expect(productionConfigProblems({ ...good, AI_PROVIDER: "mock" })).toEqual([expect.stringContaining("AI_PROVIDER=mock")]);
    expect(productionConfigProblems({ ...good, EMAIL_TRANSPORT: "console" })).toEqual([expect.stringContaining("EMAIL_TRANSPORT=console")]);
    expect(productionConfigProblems({ ...good, EMAIL_TRANSPORT: "file" })).toEqual([expect.stringContaining("EMAIL_TRANSPORT=file")]);
    expect(productionConfigProblems({ ...good, AUTH_RATE_LIMIT: "off" })).toEqual([expect.stringContaining("AUTH_RATE_LIMIT")]);
    expect(productionConfigProblems({ ...good, SMTP_URL: "" })).toEqual([expect.stringContaining("SMTP_URL")]);
    expect(productionConfigProblems({ ...good, APP_URL: "http://truedraft.example.com" })).toEqual([expect.stringContaining("https")]);
    expect(() => assertProductionConfig({ ...good, AI_PROVIDER: "mock" })).toThrow(/Refusing to start/);
  });

  it("allows development services only with an explicit demo flag", () => {
    const demo = { ...good, AI_PROVIDER: "mock", EMAIL_TRANSPORT: "file", TRUEDRAFT_DEMO_MODE: "true" };
    expect(() => assertProductionConfig(demo)).not.toThrow();
    expect(assertProductionConfig(demo)).toHaveLength(1 + 1);
    expect(() => assertProductionConfig({ ...demo, TRUEDRAFT_DEMO_MODE: "1" })).toThrow();
  });

  it("allows local sign-in only for a correctly configured desktop server", () => {
    const desktop = {
      ...good,
      TRUEDRAFT_DESKTOP: "1",
      TRUEDRAFT_DESKTOP_TOKEN: "a".repeat(64),
      TRUEDRAFT_MAILBOX_DIR: "/local/mailbox",
      HOSTNAME: "127.0.0.1",
      APP_URL: "http://127.0.0.1:3100",
      BETTER_AUTH_URL: "http://127.0.0.1:3100",
      EMAIL_TRANSPORT: "file",
    };
    expect(productionConfigProblems(desktop)).toEqual([]);
    expect(() => assertProductionConfig({ ...desktop, HOSTNAME: "0.0.0.0" })).toThrow(/loopback/);
    expect(() => assertProductionConfig({ ...desktop, TRUEDRAFT_DESKTOP_TOKEN: "" })).toThrow(/launcher token/);
  });

  it("ignores non-production environments", () => {
    expect(productionConfigProblems({ NODE_ENV: "development", AI_PROVIDER: "mock" })).toEqual([]);
  });
});

describe("AI limit rules", () => {
  it("estimates cost only when prices are configured", () => {
    expect(costMicroUsd({ inputTokens: 1000, outputTokens: 500 }, { priceInputPerMTokUsd: 3, priceOutputPerMTokUsd: 15 })).toBe(10_500);
    expect(costMicroUsd({ inputTokens: 1000, outputTokens: 500 }, { priceInputPerMTokUsd: null, priceOutputPerMTokUsd: 15 })).toBeNull();
    expect(costMicroUsd(null, { priceInputPerMTokUsd: 3, priceOutputPerMTokUsd: 15 })).toBeNull();
  });

  it("fingerprints input with a keyed hash", () => {
    const a = inputHash({ text: "same" }, "secret-1");
    expect(a).toBe(inputHash({ text: "same" }, "secret-1"));
    expect(a).not.toBe(inputHash({ text: "same" }, "secret-2")); // depends on the server secret
    expect(a).not.toBe(inputHash({ text: "different" }, "secret-1"));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
