import { describe, expect, it } from "vitest";
import { redactIdentifiers } from "@/server/redact";
import { sanitizeLogFields } from "@/server/logger";
import { sanitizeAnalyticsProps } from "@/server/analytics";
import { decryptText, encryptText } from "@/server/crypto";

describe("redaction", () => {
  it("removes emails, phone numbers, and ID numbers", () => {
    const { text, count } = redactIdentifiers(
      "Email me at li.ming@school.edu.cn or call +86 138 1234 5678 / (415) 555-0134. ID 11010120050101123X, SSN 123-45-6789, passport E12345678.",
    );
    expect(text).not.toMatch(/li\.ming|138 1234|555-0134|11010120050101123X|123-45-6789|E12345678/);
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it("leaves ordinary essay text and years alone", () => {
    const input = "In 2019 I built 3 robots and scored 98 on the test.";
    expect(redactIdentifiers(input)).toEqual({ text: input, count: 0 });
  });
});

describe("log and analytics hygiene", () => {
  it("drops unknown log fields such as essay text", () => {
    const out = sanitizeLogFields({ essayId: "abc", draft: "secret essay", prompt: "secret", runId: "r1" } as never);
    expect(out).toEqual({ essayId: "abc", runId: "r1" });
  });

  it("caps long log strings", () => {
    const out = sanitizeLogFields({ route: "x".repeat(500) });
    expect(String(out.route).length).toBeLessThan(100);
  });

  it("only passes enumerated analytics properties", () => {
    expect(sanitizeAnalyticsProps({ kind: "full_feedback", essay: "secret", language: "this is free text with spaces" })).toEqual({ kind: "full_feedback" });
  });
});

describe("encryption", () => {
  it("round-trips and binds ciphertext to its purpose", () => {
    const c = encryptText("我的文书 my essay", "essay_draft");
    expect(c).not.toContain("essay");
    expect(decryptText(c, "essay_draft")).toBe("我的文书 my essay");
    expect(() => decryptText(c, "feedback_result")).toThrow();
  });

  it("uses a fresh IV each time", () => {
    expect(encryptText("same", "essay_draft")).not.toBe(encryptText("same", "essay_draft"));
  });
});
