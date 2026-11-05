import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraftSaver, type SaveSendResult, type SaveStatus } from "@/lib/draft-saver";

/** An in-memory stand-in for PUT /api/essays/:id/draft with the same revision rules. */
function fakeServer(initial = "") {
  const server = { text: initial, revision: 0, inFlight: 0, maxInFlight: 0, received: [] as string[] };
  const gates: (() => void)[] = [];
  let failNext = 0;
  const send = async (content: string, baseRevision: number): Promise<SaveSendResult> => {
    server.inFlight += 1;
    server.maxInFlight = Math.max(server.maxInFlight, server.inFlight);
    await new Promise<void>((resolve) => gates.push(resolve));
    server.inFlight -= 1;
    if (failNext > 0) {
      failNext -= 1;
      return { ok: false, status: 0, code: "network" };
    }
    server.received.push(content);
    if (baseRevision !== server.revision && content !== server.text) {
      return { ok: false, status: 409, code: "draft_conflict", details: { revision: server.revision } };
    }
    if (content !== server.text || baseRevision === server.revision) {
      server.text = content;
      server.revision += 1;
    }
    return { ok: true, revision: server.revision, savedAt: new Date().toISOString() };
  };
  /** Let the oldest pending request complete. */
  const release = async () => {
    for (let i = 0; i < 20 && gates.length === 0; i++) await Promise.resolve();
    gates.shift()?.();
    for (let i = 0; i < 20; i++) await Promise.resolve();
  };
  /** Wait until a request has actually been sent. */
  const sent = async () => {
    for (let i = 0; i < 20 && gates.length === 0; i++) await Promise.resolve();
  };
  return { server, send, release, sent, failNext: (n: number) => (failNext = n), pending: () => gates.length };
}

function makeSaver(fake: ReturnType<typeof fakeServer>, initial = "") {
  const statuses: SaveStatus[] = [];
  const saver = new DraftSaver({ initialText: initial, initialRevision: 0, send: fake.send, onStatus: (s) => statuses.push(s), debounceMs: 100, retryDelaysMs: [1000] });
  return { saver, statuses, last: () => statuses[statuses.length - 1] };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("DraftSaver", () => {
  it("sends one save at a time and the latest text survives continued typing", async () => {
    const fake = fakeServer();
    const { saver, last } = makeSaver(fake);
    saver.update("Hello");
    const first = saver.flush();
    await fake.sent();
    saver.update("Hello world"); // typed while the first save is in flight
    const second = saver.flush();
    saver.update("Hello world, again");
    expect(fake.server.maxInFlight).toBeLessThanOrEqual(1);
    await fake.release();
    expect(saver.isDirty()).toBe(true); // only "Hello" was acknowledged
    expect(saver.savedText).toBe("Hello");
    await fake.release();
    await Promise.all([first, second]);
    expect(fake.server.received).toEqual(["Hello", "Hello world, again"]);
    expect(fake.server.maxInFlight).toBe(1);
    expect(fake.server.text).toBe("Hello world, again");
    expect(saver.isDirty()).toBe(false);
    expect(last().state).toBe("saved");
  });

  it("never reports text as saved unless that exact text was acknowledged", async () => {
    const fake = fakeServer();
    const { saver, statuses } = makeSaver(fake);
    saver.update("Draft A");
    const p = saver.flush();
    await fake.sent();
    saver.update("Draft AB");
    await fake.release();
    // After A is acknowledged, AB is still pending: no "saved" status may have been emitted yet.
    expect(statuses.some((s) => s.state === "saved")).toBe(false);
    await fake.release();
    await p;
    expect(statuses[statuses.length - 1].state).toBe("saved");
    expect(fake.server.text).toBe("Draft AB");
  });

  it("debounces typing into a single save", async () => {
    const fake = fakeServer();
    const { saver } = makeSaver(fake);
    for (const text of ["a", "ab", "abc", "abcd"]) saver.update(text);
    await vi.advanceTimersByTimeAsync(150);
    await fake.release();
    expect(fake.server.received).toEqual(["abcd"]);
  });

  it("stops on a conflict from another tab and overwrites only when asked", async () => {
    const fake = fakeServer("v0");
    const tabA = makeSaver(fake, "v0");
    const tabB = makeSaver(fake, "v0");
    tabB.saver.update("from tab B");
    const b = tabB.saver.flush();
    await fake.release();
    expect(await b).toBe(true);

    tabA.saver.update("from tab A");
    const a = tabA.saver.flush();
    await fake.release();
    expect(await a).toBe(false);
    expect(tabA.last().state).toBe("conflict");
    expect(fake.server.text).toBe("from tab B"); // nothing overwritten
    tabA.saver.update("from tab A, still typing");
    expect(tabA.last().state).toBe("conflict"); // typing doesn't silently resume saving

    const overwrite = tabA.saver.overwriteServer();
    await fake.release();
    expect(await overwrite).toBe(true);
    expect(fake.server.text).toBe("from tab A, still typing");
  });

  it("can switch to the server copy after a conflict", async () => {
    const fake = fakeServer("x");
    const { saver, last } = makeSaver(fake, "x");
    fake.server.text = "changed elsewhere";
    fake.server.revision = 5;
    saver.update("mine");
    const p = saver.flush();
    await fake.release();
    expect(await p).toBe(false);
    saver.acceptServer("changed elsewhere", 5);
    expect(saver.isDirty()).toBe(false);
    expect(last().state).toBe("saved");
    saver.update("changed elsewhere, then edited");
    const q = saver.flush();
    await fake.release();
    expect(await q).toBe(true);
    expect(fake.server.text).toBe("changed elsewhere, then edited");
  });

  it("keeps the text and retries after a network failure", async () => {
    const fake = fakeServer();
    const { saver, last } = makeSaver(fake);
    fake.failNext(1);
    saver.update("important sentence");
    const p = saver.flush();
    await fake.release();
    expect(await p).toBe(false);
    expect(last()).toMatchObject({ state: "error", retrying: true });
    expect(saver.isDirty()).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    await fake.release();
    expect(fake.server.text).toBe("important sentence");
    expect(last().state).toBe("saved");
  });

  it("treats a retried, already-applied save as success", async () => {
    const fake = fakeServer();
    // The server applied the first request but the response was lost.
    fake.server.text = "same text";
    fake.server.revision = 1;
    const { saver } = makeSaver(fake);
    saver.update("same text");
    const p = saver.flush();
    await fake.release();
    expect(await p).toBe(true);
  });
});
