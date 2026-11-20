import { writeFileSync, readFileSync } from "node:fs";
import {
  SAMPLE_ESSAY,
  SAMPLE_PROMPT,
  SAMPLE_FEEDBACK_EN as f,
} from "../src/content/sample";

const start = "<!-- sample-feedback:start -->";
const end = "<!-- sample-feedback:end -->";
const md = [
  "## A closer look at the feedback",
  "",
  "The sample follows an ordinary student trying to help a classmate choose an English reply. The writer gets distracted discussing small phrases at lunch and is still working out what they think. The person, draft and feedback are illustrative and hand-written; this is not a real student’s submission or a live AI response.",
  "",
  "<details>",
  "<summary>Read the example: what to keep, what to develop, and how to revise</summary>",
  "",
  `**What to keep:** ${f.strengths[1].point}`,
  "",
  `**First priority: ${f.primary_priority.title}.** ${f.primary_priority.explanation}`,
  ...f.passage_comments
    .slice(0, 2)
    .flatMap((p) => [
      "",
      `> ${p.quote}`,
      "",
      `**What needs work:** ${p.observation}`,
      "",
      `**Why it matters:** ${p.why_it_matters}`,
      "",
      `**Try this:** ${p.revision_question}`,
    ]),
  "",
  "**A manageable revision order**",
  "",
  ...f.revision_plan.map((r, i) => `${i + 1}. ${r.task}`),
  "",
  "[Read the complete sample draft and feedback](docs/EXAMPLE_FEEDBACK.md), including all eight diagnostic areas, six passage comments, voice checks and questions for the writer.",
  "",
  "</details>",
].join("\n");
const readmePath = "README.md";
let readme = readFileSync(readmePath, "utf8");
const block = `${start}\n${md}\n${end}`;
if (readme.includes(start))
  readme =
    readme.slice(0, readme.indexOf(start)) +
    block +
    readme.slice(readme.indexOf(end) + end.length);
else
  readme = readme.replace(
    "## Try the desktop app",
    `${block}\n\n## Try the desktop app`,
  );
writeFileSync(readmePath, readme);
const label: Record<string, string> = {
  prompt_response: "Response to the prompt",
  specificity: "Specificity",
  reflection: "Reflection",
  structure_pacing: "Structure and pacing",
  clarity: "Clarity",
  voice: "Voice",
  opening_ending: "Opening and ending",
  concision: "Concision",
};
const full = [
  "# Example essay feedback",
  "",
  "An illustrative student, situation and draft, created to demonstrate useful feedback on an everyday experience. No real student’s work or testimonial is represented. Feedback is hand-written, not a live AI response. Suggestions are questions and revision options; they do not supply new experiences or a replacement essay.",
  "",
  "## Prompt",
  "",
  SAMPLE_PROMPT,
  "",
  "## Draft",
  "",
  SAMPLE_ESSAY,
  "",
  "## Overall response",
  "",
  f.summary,
  "",
  "### What to preserve",
  "",
  ...f.strengths.flatMap((s) => [`> ${s.evidence_quote}`, "", s.point, ""]),
  `### First priority: ${f.primary_priority.title}`,
  "",
  f.primary_priority.explanation,
  "",
  "### Response to the prompt",
  "",
  f.prompt_alignment.explanation,
  "",
  "## Diagnostic areas",
  "",
  ...f.categories.flatMap((c) => [
    `### ${label[c.key]}`,
    "",
    `**${c.label.replaceAll("_", " ")}** — ${c.explanation}`,
    "",
    `> ${c.passage_quote}`,
    "",
    `**Next step:** ${c.next_step}`,
    "",
  ]),
  "## Passage-by-passage feedback",
  "",
  ...f.passage_comments.flatMap((p, i) => [
    `### ${i + 1}. ${p.priority[0].toUpperCase() + p.priority.slice(1)} priority`,
    "",
    `> ${p.quote}`,
    "",
    `**Observation:** ${p.observation}`,
    "",
    `**Why it matters:** ${p.why_it_matters}`,
    "",
    `**Revision question:** ${p.revision_question}`,
    "",
  ]),
  "## Revision plan",
  "",
  ...f.revision_plan.flatMap((r, i) => [
    `${i + 1}. **${r.task}**`,
    `   ${r.why}`,
    "",
  ]),
  "## Voice and evidence checks",
  "",
  ...f.voice_check.flatMap((v) => [`- **${v.question}** ${v.note}`]),
  "",
  "## Questions for the writer",
  "",
  ...f.questions_for_student.map((q) => `- ${q}`),
  "",
  "## Limits",
  "",
  f.limitations,
  "",
  "English, bilingual and Simplified Chinese variants of this feedback are available on the app’s `/sample-feedback` page. To regenerate this document and the README excerpt from the same sample content, run `npx tsx scripts/sample-feedback-doc.ts`.",
  "",
].join("\n");
writeFileSync("docs/EXAMPLE_FEEDBACK.md", full);
