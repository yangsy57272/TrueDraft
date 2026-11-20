import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { applyGuards, quoteAppearsIn } from "../src/server/ai/guard";
import { findQuoteEvidence } from "../src/lib/feedback-evidence";
import { suggestFit } from "../src/lib/fit";
import { buildTodayPlan, taskDependencies } from "../src/lib/today-plan";
import { demoHub, DEMO_DRAFT, DEMO_QUOTE } from "../src/content/demo-scenario";
import {
  noAdmissionPredictions,
  proseLanguage,
  noGhostwritingCompliance,
} from "../eval/checks";

const rows: {
  id: string;
  en: string;
  zh: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}[] = [];
function check(
  id: string,
  en: string,
  zh: string,
  input: string,
  expected: string,
  actual: unknown,
) {
  const value = String(actual);
  rows.push({
    id,
    en,
    zh,
    input,
    expected,
    actual: value,
    passed: value === expected,
  });
}
check(
  "quote-en",
  "Locate a real English quote",
  "定位英文原句",
  DEMO_QUOTE,
  "true",
  quoteAppearsIn(DEMO_DRAFT, DEMO_QUOTE),
);
check(
  "quote-invented",
  "Flag a fabricated quotation",
  "识别不存在的引用",
  "I founded a nationwide engineering charity.",
  "false",
  quoteAppearsIn(DEMO_DRAFT, "I founded a nationwide engineering charity."),
);
check(
  "quote-zh",
  "Locate Chinese text with spacing",
  "定位中文引用并处理空白",
  "我开始  记录每一次失败。",
  "true",
  quoteAppearsIn("我开始\n记录每一次失败。", "我开始 记录每一次失败。"),
);
const normalized = findQuoteEvidence(
  "First paragraph.\n\nShe said “ask  first” before acting.",
  'she said "ask first"',
);
check(
  "source-offsets",
  "Map normalized quotes to the source paragraph",
  "将标点统一后的引用映射回原文段落",
  'she said "ask first"',
  "2:She said “ask  first”",
  normalized ? `${normalized.paragraph}:${normalized.text}` : "missing",
);
check(
  "prediction-en",
  "Reject a clear admission promise",
  "识别英文录取保证",
  "You will definitely get into college.",
  "false",
  noAdmissionPredictions({ summary: "You will definitely get into college." })
    .pass,
);
check(
  "prediction-zh",
  "Reject a Chinese admission promise",
  "识别中文录取保证",
  "你一定会被录取。",
  "false",
  noAdmissionPredictions({ summary: "你一定会被录取。" }).pass,
);
check(
  "ghostwriting",
  "Flag explicit essay-writing compliance",
  "识别明确的代写响应",
  "Here is your essay",
  "false",
  noGhostwritingCompliance({ reply: "Here is your essay" }).pass,
);
for (const [language, text] of [
  ["en", "Ask what changed in your reasoning and point to a specific moment."],
  ["zh", "请指出你的思考发生变化的具体时刻，并解释你为什么改变了方法。"],
] as const) {
  check(
    `language-${language}`,
    `Check ${language} prose heuristic`,
    `检查${language === "en" ? "英文" : "中文"}语言启发式`,
    text,
    "true",
    proseLanguage({ summary: text }, language, ["summary"]).pass,
  );
}
const sentence = {
  alternatives: [
    { text: "Ask first." },
    { text: "Listen first." },
    { text: "Another short option." },
    { text: "x".repeat(1000) },
  ],
};
for (const mode of ["clearer", "translate"] as const) {
  const guarded = applyGuards("sentence", sentence, {
    draft: DEMO_DRAFT,
    selection: "I reached for a screwdriver.",
    mode,
    wordCount: 80,
    wordLimit: 650,
  }) as { alternatives: unknown[] };
  check(
    `alternatives-${mode}`,
    `Bound alternatives: ${mode}`,
    `限制替代句：${mode}`,
    "Three short options and a 1,000-character replacement",
    mode === "translate" ? "0" : "2",
    guarded.alternatives.length,
  );
}
const overlong = applyGuards(
  "sentence",
  { alternatives: [{ text: "x".repeat(1000) }] },
  {
    draft: DEMO_DRAFT,
    selection: "Listen first.",
    mode: "clearer",
    wordCount: 80,
    wordLimit: 650,
  },
) as { alternatives: unknown[] };
check(
  "alternative-length",
  "Discard an essay-length alternative",
  "丢弃过长替代句",
  "One 1,000-character alternative to a short sentence",
  "0",
  overlong.alternatives.length,
);
const ranges = {
  sat: { low: 1300, high: 1450, approximate: false },
  act: null,
};
check(
  "unknown-school",
  "Keep missing admission data unassessed",
  "缺失录取数据时不推断",
  "No admission rate, SAT 1600",
  "null",
  suggestFit(null, ranges, { sat: 1600, act: null, testPlan: "submit" }),
);
check(
  "reach-floor",
  "Keep a highly selective school as Reach",
  "高选择性学校保持 Reach",
  "12% admission rate, SAT 1600",
  "reach",
  suggestFit(12, ranges, { sat: 1600, act: null, testPlan: "submit" })
    ?.category,
);
const hub = demoHub(["lakeside", "northfield"], []);
const shared = hub.plan.tasks.find((t) => t.id === "global:common_app:draft")!;
check(
  "shared-once",
  "Schedule one shared statement for two schools",
  "两校通用文书只安排一次",
  "Two active Common App schools",
  "1",
  hub.plan.tasks.filter((t) => t.id === shared.id).length,
);
check(
  "dependencies",
  "Hold drafting until brainstorming is handled",
  "素材整理完成后再起草",
  "Unfinished ideas → draft",
  "global:common_app:ideas",
  taskDependencies(shared, hub.plan.tasks, hub.schools)
    .map((t) => t.id)
    .join(","),
);
const today = buildTodayPlan(hub);
check(
  "time-cap",
  "Keep the focus plan inside saved availability",
  "当日重点不超出保存的可用时间",
  `${today.availableMinutes} allocated minutes`,
  "true",
  today.actions.reduce((n, t) => n + t.minutes, 0) <= today.availableMinutes &&
    today.actions.length <= 3,
);
const noTime = buildTodayPlan({ ...hub, plan: { ...hub.plan, sessions: [] } });
check(
  "no-time",
  "Do not invent free time",
  "不假定额外空闲时间",
  "No work sessions today",
  "0",
  noTime.actions.length,
);
const sourceFiles = [
  "scripts/quality-check.ts",
  "eval/checks.ts",
  "src/server/ai/guard.ts",
  "src/lib/feedback-evidence.ts",
  "src/lib/fit.ts",
  "src/lib/today-plan.ts",
  "src/lib/application-schedule.ts",
  "src/content/demo-scenario.ts",
];
const sourceDigest = createHash("sha256")
  .update(sourceFiles.map((p) => `${p}\n${readFileSync(p, "utf8")}`).join("\n"))
  .digest("hex");
const report = {
  suiteVersion: "1.0",
  scope:
    "Deterministic regression fixtures; no live model calls or student data",
  sourceDigest,
  passed: rows.filter((r) => r.passed).length,
  total: rows.length,
  rows,
};
const output = JSON.stringify(report, null, 2) + "\n";
const target = "src/content/quality-report.json";
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== output)
    throw new Error(
      "Quality report is stale. Run npm run quality:report and commit the result.",
    );
} else writeFileSync(target, output);
console.log(
  `${report.passed}/${report.total} deterministic fixture checks passed. Live AI quality: not measured.`,
);
if (report.passed !== report.total) {
  console.error(rows.filter((r) => !r.passed));
  process.exitCode = 1;
}
