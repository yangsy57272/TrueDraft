import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CASES } from "../eval/cases";
import type { CheckResult } from "../eval/checks";
import { applyGuards } from "../src/server/ai/guard";
import { buildSystemPrompt, buildUserMessage, PROMPT_VERSION, type PromptInput } from "../src/server/ai/prompts";
import { getProvider } from "../src/server/ai/provider";
import { callModel, ModelCallError } from "../src/server/ai/run";
import { SCHEMA_VERSION } from "../src/server/ai/schemas";
import { countWords } from "../src/lib/wordcount";

/**
 * Run the fictional evaluation cases against the configured AI provider and check each response's
 * properties. Usage: AI_PROVIDER=anthropic ANTHROPIC_API_KEY=… npm run eval:ai [-- --only <id>]
 * Writes eval-results/<timestamp>.{json,md}; exits non-zero if any required check fails.
 */
async function main() {
  const args = process.argv.slice(2);
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
  const provider = await getProvider();
  if (provider.kind === "mock" && !args.includes("--allow-mock")) {
    console.error("The mock provider returns placeholders, so most checks would fail. Configure a real provider, or pass --allow-mock to smoke-test the harness.");
    process.exit(2);
  }
  const cases = CASES.filter((c) => !only || c.id === only);
  const rows: { id: string; description: string; error?: string; checks: CheckResult[]; ms: number }[] = [];

  for (const c of cases) {
    const started = Date.now();
    const draft = c.input.essay ?? "";
    const paragraph = c.input.selection ? (draft.split("\n\n").find((p) => p.includes(c.input.selection!)) ?? "") : "";
    const input: PromptInput = {
      kind: c.kind,
      essayPrompt: c.input.essayPrompt,
      context: c.input.context ?? null,
      applicationType: "common_app",
      wordLimit: c.input.wordLimit ?? null,
      focusAreas: [],
      ...(c.kind === "full_feedback" ? { essay: draft, wordCount: countWords(draft) } : {}),
      ...(c.kind === "sentence" ? { selection: c.input.selection, surrounding: paragraph, sentenceMode: c.input.sentenceMode } : {}),
      ...(c.kind === "brainstorm" ? { conversation: c.input.conversation } : {}),
    };
    try {
      const response = await callModel({
        kind: c.kind,
        system: buildSystemPrompt(c.kind, c.language),
        userMessage: buildUserMessage(input),
        onStage: () => {},
        logFields: { kind: c.kind },
      });
      const result = applyGuards(c.kind, response.parsed, {
        draft,
        selection: c.input.selection ?? "",
        mode: c.input.sentenceMode,
        wordCount: countWords(draft),
        wordLimit: c.input.wordLimit ?? null,
      });
      rows.push({ id: c.id, description: c.description, checks: c.checks(result), ms: Date.now() - started });
    } catch (error) {
      const code = error instanceof ModelCallError ? error.code : (error as Error).message;
      rows.push({ id: c.id, description: c.description, error: code, checks: [{ name: "valid_response", pass: false, detail: code }], ms: Date.now() - started });
    }
    const last = rows[rows.length - 1];
    const failed = last.checks.filter((k) => !k.pass && !k.advisory);
    console.log(`${failed.length ? "✗" : "✓"} ${c.id}${failed.length ? ` — ${failed.map((f) => `${f.name} (${f.detail ?? ""})`).join("; ")}` : ""}`);
  }

  const required = rows.flatMap((r) => r.checks.filter((k) => !k.advisory));
  const passed = required.filter((k) => k.pass).length;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const meta = { ranAt: new Date().toISOString(), provider: provider.kind, model: provider.model, promptVersion: PROMPT_VERSION, schemaVersion: SCHEMA_VERSION };
  const md = [
    `# AI evaluation — ${meta.ranAt}`,
    "",
    `Provider ${meta.provider} · model ${meta.model} · prompt ${meta.promptVersion} · schema ${meta.schemaVersion}`,
    "",
    `**${passed} of ${required.length} required checks passed.** All cases use fictional material.`,
    "",
    "| Case | Check | Result | Detail |",
    "|---|---|---|---|",
    ...rows.flatMap((r) => r.checks.map((k) => `| ${r.id} | ${k.name}${k.advisory ? " (advisory)" : ""} | ${k.pass ? "pass" : "FAIL"} | ${(k.detail ?? "").replace(/\|/g, "/")} |`)),
    "",
  ].join("\n");
  const dir = path.join(process.cwd(), "eval-results");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${stamp}.json`), JSON.stringify({ ...meta, rows }, null, 2));
  await writeFile(path.join(dir, `${stamp}.md`), md);
  console.log(`\n${passed}/${required.length} required checks passed. Report: eval-results/${stamp}.md`);
  process.exit(passed === required.length ? 0 : 1);
}

main().catch((error) => {
  console.error("Evaluation failed to run:", error instanceof Error ? error.message : error);
  process.exit(2);
});
