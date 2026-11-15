// Browser checks with a simulated APS/AI host. Never reported as real Anna integration.
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const fixture = {
  material: "sufficient",
  insufficient_reason: "Fictional sample needs more detail.",
  summary: "TEST FIXTURE — not live AI feedback.",
  strengths: [
    {
      point: "A concrete moment grounds the reflection.",
      evidence_quote: "mapping the shadows together",
    },
  ],
  primary_priority: {
    title: "Reflect",
    explanation: "What changed?",
    zh_note: null,
  },
  prompt_alignment: { status: "partly", explanation: "A lesson is named." },
  categories: [
    "prompt_response",
    "specificity",
    "reflection",
    "structure_pacing",
    "clarity",
    "voice",
    "opening_ending",
    "concision",
  ].map((key) => ({
    key,
    label: "developing",
    explanation: "Fictional test diagnosis.",
    next_step: "Ask what changed in your own habits.",
    passage_quote: null,
    zh_note: null,
  })),
  passage_comments: [
    {
      quote: "mapping the shadows together",
      observation: "A shared action is specific.",
      why_it_matters: "It demonstrates listening.",
      revision_question: "What did you notice that afternoon?",
      priority: "high",
      zh_note: null,
    },
  ],
  revision_plan: [
    {
      task: "Describe one observation from the garden.",
      why: "Ground the lesson in a real moment.",
      zh_note: null,
    },
    {
      task: "Explain how your meeting habits changed.",
      why: "Connect the moment to growth.",
      zh_note: null,
    },
    {
      task: "Read aloud and keep your natural voice.",
      why: "Preserve your authorship.",
      zh_note: null,
    },
  ],
  voice_check: [],
  questions_for_student: ["What did you learn?"],
  limitations: "Simulated test feedback, not live Anna AI.",
};
const sdk = `export const AnnaAppRuntime={connect:async()=>({storage:{
get:async({key})=>{const r=JSON.parse(localStorage.getItem(key)||'null');return r?{exists:true,...r}:{exists:false}},
set:async({key,value,if_match})=>{const old=JSON.parse(localStorage.getItem(key)||'null');if(if_match&&old?.etag!==if_match)throw new Error('precondition_failed');const generation=(old?.generation||0)+1;const r={value,etag:String(generation),generation};localStorage.setItem(key,JSON.stringify(r));return r},
delete:async({key,if_match})=>{const old=JSON.parse(localStorage.getItem(key)||'null');if(if_match&&old?.etag!==if_match)throw new Error('precondition_failed');localStorage.removeItem(key);return{}},
list:async({prefix})=>({items:Object.keys(localStorage).filter(key=>key.startsWith(prefix)).map(key=>({key}))})},
llm:{complete:async()=>{localStorage.setItem('calls',String(Number(localStorage.getItem('calls')||0)+1));await new Promise(r=>setTimeout(r,500));if(localStorage.getItem('failure')==='timeout')throw new Error('timeout');if(localStorage.getItem('failure'))return {ok:false,error:{code:'APP_QUOTA_EXCEEDED'}};return {stopReason:'endTurn',content:{text:JSON.stringify(${JSON.stringify(fixture)})},usage:{inputTokens:100,outputTokens:50}}}}
})};`;
const server = createServer(async (req, res) => {
  try {
    if (req.url.includes("/_sdk/")) {
      res.setHeader("Content-Type", "text/javascript");
      res.end(sdk);
      return;
    }
    const path = req.url === "/" ? "index.html" : req.url.slice(1);
    if (!["index.html", "app.css", "app.js"].includes(path)) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader(
      "Content-Type",
      path.endsWith(".js")
        ? "text/javascript"
        : path.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.end(await readFile(new URL("../bundle/" + path, import.meta.url)));
  } catch {
    res.writeHead(500).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM_PATH
    ? { executablePath: process.env.PW_CHROMIUM_PATH }
    : { channel: "chrome" }),
});
try {
  const context = await browser.newContext({ acceptDownloads: true });
  const p = await context.newPage();
  await p.goto(url);
  assert.equal(await p.locator("#workspace").isVisible(), false);
  await p.locator("#enter").click();
  await p.locator("#notice").filter({ hasText: "adult requirement" }).waitFor();
  assert.equal(await p.evaluate(() => localStorage.length), 0);
  await p.locator("#adult").check();
  await p.locator("#enter").click();
  await p.locator("#workspace").waitFor();
  await p.locator("#sample").click();
  await p.locator("#save").click();
  await p.locator("#notice").filter({ hasText: "Version saved" }).waitFor();
  assert.equal(await p.evaluate(() => localStorage.getItem("calls")), null);
  const original = await p.locator("#draft").inputValue();
  await p.reload();
  await p.locator("#adult").check();
  await p.locator("#enter").click();
  await p.locator("#workspace").waitFor();
  await p.locator("#open").click();
  await p.waitForFunction(() =>
    document.querySelector("#draft").value.includes("imaginary"),
  );
  assert.equal(await p.locator("#draft").inputValue(), original);
  await p.locator("#consent").check();
  await p.locator("#analyze").dblclick();
  await p.locator("#feedback").filter({ hasText: "TEST FIXTURE" }).waitFor();
  assert.equal(await p.evaluate(() => localStorage.getItem("calls")), "1");
  await p.locator("#draft").fill(original + " I have revised this myself.");
  await p
    .locator("#stale")
    .filter({ hasText: "older saved version" })
    .waitFor();
  assert.equal(await p.locator("#consent").isChecked(), false);
  await p.locator("#save").click();
  await p.locator("#notice").filter({ hasText: "Version saved" }).waitFor();
  assert.equal(await p.locator("#history option").count(), 2);
  const q = await context.newPage();
  await q.goto(url);
  await q.locator("#adult").check();
  await q.locator("#enter").click();
  await q.locator("#workspace").waitFor();
  await q.locator("#open").click();
  await q.waitForFunction(() =>
    document.querySelector("#draft").value.includes("imaginary"),
  );
  await p.locator("#draft").fill(original + " First window.");
  await p.locator("#save").click();
  await p.locator("#notice").filter({ hasText: "Version saved" }).waitFor();
  await q.locator("#draft").fill(original + " Second window.");
  await q.locator("#save").click();
  await q
    .locator("#notice")
    .filter({ hasText: "precondition_failed" })
    .waitFor();
  assert.match(await q.locator("#draft").inputValue(), /Second window/);
  await q.close();
  const downloadPromise = p.waitForEvent("download");
  await p.locator("#export").click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(exported.records[0].versions.length, 3);
  assert.equal(
    exported.records[0].reviews[0].versionId,
    exported.records[0].versions[0].id,
  );
  await p.locator("#locale").selectOption("zh-CN");
  await p.setViewportSize({ width: 360, height: 640 });
  assert.equal(await p.locator("#save").innerText(), "保存版本，不调用 AI");
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await mkdir(new URL("../review/screenshots/", import.meta.url), {
    recursive: true,
  });
  await p.screenshot({
    path: new URL(
      "../review/screenshots/zh-narrow-simulated.png",
      import.meta.url,
    ).pathname,
    fullPage: true,
  });
  await p.locator("#locale").selectOption("en");
  await p.setViewportSize({ width: 1000, height: 720 });
  await p.screenshot({
    path: new URL(
      "../review/screenshots/en-review-simulated.png",
      import.meta.url,
    ).pathname,
    fullPage: true,
  });
  await p.locator("#deleteAll").click();
  await p.locator("#confirmDelete").check();
  await p.locator("#performDelete").click();
  await p
    .locator("#notice")
    .filter({ hasText: "Soft deletion completed" })
    .waitFor();
  assert.equal(await p.locator("#saved option").count(), 0);
  await p.locator("#sample").click();
  await p.locator("#consent").check();
  await p.locator("#analyze").click();
  await p.locator("#cancel").click();
  await p.locator("#notice").filter({ hasText: "Result discarded" }).waitFor();
  assert.equal(await p.locator("#feedback").innerText(), "");
  await p.locator("#draft").fill(original + " quota failure");
  await p.evaluate(() => localStorage.setItem("failure", "1"));
  await p.locator("#consent").check();
  await p.locator("#analyze").click();
  await p
    .locator("#notice")
    .filter({ hasText: "APP_QUOTA_EXCEEDED" })
    .waitFor();
  assert.match(await p.locator("#draft").inputValue(), /quota failure/);
  const count = await p.evaluate(() => localStorage.getItem("calls"));
  assert.equal(count, "3");
  await p.evaluate(() => localStorage.setItem("failure", "timeout"));
  await p.locator("#consent").check();
  await p.locator("#analyze").click();
  await p.locator("#notice").filter({ hasText: "request_failed" }).waitFor();
  const timeoutCount = await p.evaluate(() => localStorage.getItem("calls"));
  await p.locator("#consent").check();
  await p.locator("#analyze").click();
  await p.locator("#notice").filter({ hasText: "pending_analysis" }).waitFor();
  assert.equal(
    await p.evaluate(() => localStorage.getItem("calls")),
    timeoutCount,
  );
  console.log(
    "PASS simulated browser workflow: age gate, save/reopen, consent, duplicate prevention, version linkage/staleness, conflict, export, bilingual/narrow viewport, deletion, discard, quota failure and retry guard.",
  );
  await context.close();
} finally {
  await browser.close();
  server.close();
}
