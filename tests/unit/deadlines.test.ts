import { describe, expect, it } from "vitest";
import { daysUntil, deadlineInputSchema, deadlineInstant, deadlineState, type Deadline } from "@/lib/deadlines";

const d = (over: Partial<Deadline> = {}): Deadline => ({ id: "d1", type: "application", date: "2026-01-01", time: null, timeZone: "America/New_York", source: null, done: false, ...over });

describe("deadline time zones", () => {
  it("converts a named zone exactly, defaulting to 11:59 pm", () => {
    // 2026-01-01 23:59:59 in New York (EST, UTC-5) is 2026-01-02 04:59:59 UTC.
    expect(deadlineInstant(d()).toISOString()).toBe("2026-01-02T04:59:59.000Z");
    // Same wall time in summer (EDT, UTC-4).
    expect(deadlineInstant(d({ date: "2026-07-01" })).toISOString()).toBe("2026-07-02T03:59:59.000Z");
    expect(deadlineInstant(d({ timeZone: "Asia/Shanghai", time: "17:00" })).toISOString()).toBe("2026-01-01T09:00:59.000Z");
  });

  it("uses the viewer's zone for 'local' deadlines", () => {
    const local = d({ timeZone: "local" });
    expect(deadlineInstant(local, "Asia/Shanghai").toISOString()).toBe("2026-01-01T15:59:59.000Z");
    expect(deadlineInstant(local, "America/Los_Angeles").toISOString()).toBe("2026-01-02T07:59:59.000Z");
  });

  it("handles the day clocks change", () => {
    // US DST started 2026-03-08 at 2 am; 11:59 pm that day is EDT (UTC-4).
    expect(deadlineInstant(d({ date: "2026-03-08" })).toISOString()).toBe("2026-03-09T03:59:59.000Z");
  });
});

describe("deadline states", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  it("is completed, overdue, due soon, or upcoming", () => {
    expect(deadlineState(d({ date: "2026-11-01", done: true }), now)).toBe("completed");
    expect(deadlineState(d({ date: "2026-11-01" }), now)).toBe("overdue");
    expect(deadlineState(d({ date: "2026-11-10" }), now)).toBe("due_soon");
    expect(deadlineState(d({ date: "2027-01-01" }), now)).toBe("upcoming");
  });

  it("is still due today until the deadline's own time passes in its zone", () => {
    // Nov 5, 11:59 pm in Los Angeles hasn't happened yet at noon UTC.
    expect(deadlineState(d({ date: "2026-11-05", timeZone: "America/Los_Angeles" }), now)).toBe("due_soon");
    // Nov 5, 5 pm in Shanghai (09:00 UTC) has passed.
    expect(deadlineState(d({ date: "2026-11-05", timeZone: "Asia/Shanghai", time: "17:00" }), now)).toBe("overdue");
    expect(daysUntil(d({ date: "2026-11-15" }), now)).toBe(10);
  });

  it("validates dates, times, and zones", () => {
    expect(deadlineInputSchema.safeParse({ type: "application", date: "2026-02-31" }).success).toBe(false);
    expect(deadlineInputSchema.safeParse({ type: "application", date: "2026-02-28", time: "24:00" }).success).toBe(false);
    expect(deadlineInputSchema.safeParse({ type: "application", date: "2026-02-28", timeZone: "Mars/Olympus" }).success).toBe(false);
    expect(deadlineInputSchema.parse({ type: "financial_aid", date: "2026-02-28" })).toMatchObject({ timeZone: "local", done: false });
  });
});
