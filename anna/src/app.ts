import {
  PREFIX,
  MAX_TEXT,
  probe,
  read,
  write,
  request,
  parseFeedback,
  result,
  validateInput,
  errorCode,
  type Host,
  type RecordData,
  type Listed,
} from "./core";
import type { FeedbackLanguage } from "../../src/i18n/config";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);
const val = (id: string) => input(id).value;
let zh = false,
  host: Host,
  data: RecordData | undefined,
  etag: string | undefined,
  busy = false,
  discarded = false,
  dirty = false;
let deleteAll = false,
  active = true;
const copy: Record<string, [string, string]> = {
  principle: [
    "Feedback to help you revise your own writing. No replacement essays, invented experiences or admission predictions.",
    "反馈帮助你自行修改；不代写整篇文书、不编造经历、不预测录取。",
  ],
  welcome: ["A workspace for adult applicants", "面向成年申请人的文书工作台"],
  ageText: [
    "Anna requires age 18 or the higher age of legal majority where you live. Parental consent is not a substitute. No testing with minors.",
    "Anna 要求年满18岁或居住地更高的成年年龄。家长同意不能替代；不接受未成年人测试。",
  ],
  adultText: ["I meet Anna’s age requirement.", "我符合 Anna 的年龄要求。"],
  enter: ["Open my workspace", "打开我的工作台"],
  savedLabel: ["Saved essays", "已保存文书"],
  open: ["Open selected", "打开所选"],
  new: ["New essay", "新建文书"],
  sample: ["Load fictional example", "载入虚构示例"],
  editorHeading: ["1. Your prompt & draft", "1. 题目与自己的草稿"],
  promptLabel: [
    "Essay prompt (up to 4,000 characters)",
    "文书题目（最多4000字符）",
  ],
  draftLabel: [
    "Your draft (up to 20,000 characters)",
    "自己的草稿（最多20000字符）",
  ],
  feedbackLanguage: ["Feedback language", "反馈语言"],
  retentionLabel: [
    "Retention from the latest save or analysis (all versions and feedback)",
    "从最近一次保存或分析起保留（含全部版本和反馈）",
  ],
  save: ["Save version — no AI", "保存版本，不调用 AI"],
  historyLabel: ["Saved versions", "历史版本"],
  restore: ["Copy version into editor", "将此版本复制到编辑器"],
  reviewHeading: ["2. Review & revise yourself", "2. 获取反馈，自行修改"],
  privacyTitle: ["What is sent and stored?", "哪些内容会发送和保存？"],
  privacyText: [
    "Save sends your prompt, draft and versions to Anna’s per-user App storage. Analyze sends a best-effort redacted copy of only this prompt and draft, feedback language and coaching instructions through Anna to its selected model provider. Redaction is imperfect: remove names and sensitive details yourself. Chat history, school lists and other apps are never requested. TrueDraft has no external backend or analytics here and does not train models. Anna promises no model-weight training, but may retain service context, security/billing records; provider retention/training terms vary. This is not end-to-end encrypted storage.",
    "保存会将题目、草稿和版本发送至 Anna 的用户专属应用存储。分析只将尽力脱敏的当前题目、草稿、反馈语言和指导指令，经 Anna 发至其选定模型提供方。脱敏不完全，请自行删除姓名和敏感内容。本应用不请求聊天历史、选校或其他应用资料；没有独立外部后端或分析追踪，也不训练模型。Anna 承诺不训练模型权重，但可能保留服务上下文、安全及计费记录；模型提供方的留存和训练条款各异。这不是端到端加密存储。",
  ],
  fees: [
    "Uses your Anna Credits or platform-selected optional BYOK. No API key is entered here. Actual token usage is shown only when returned by Anna; no dollar bill is estimated. Stopping display or timing out may not stop provider billing. No automatic paid retries.",
    "使用 Anna Credits 或平台选定的可选 BYOK，无需在此填写密钥。仅展示 Anna 返回的实际 token 用量，不估算美元账单。停止显示或超时可能无法停止提供方计费；不自动付费重试。",
  ],
  consentText: [
    "For this draft, I understand the processing and want AI feedback. I can save without AI.",
    "针对此草稿，我理解数据处理并选择 AI 反馈；也可只保存。",
  ],
  analyze: ["Analyze saved version", "分析已保存版本"],
  cancel: ["Stop displaying result", "停止接收结果"],
  dataHeading: ["3. Your data", "3. 管理数据"],
  deletionText: [
    "Export includes prompts, all saved versions and feedback. Deletion hides all of that essay’s records in Anna APS (soft delete), not verified permanent erasure. TTL expiration is not proof of backup purge. Contact Anna and the model provider for their retention/deletion. Uninstall alone is not a deletion request. Export before deleting.",
    "导出包含题目、全部历史版本和反馈。删除将该文书完整记录在 Anna APS 中软删除，无法验证永久清除。到期也不证明备份已清除。Anna 和模型提供方的留存、删除需分别向其申请。卸载不等于删除。请先导出。",
  ],
  export: ["Export all data (.json)", "导出全部数据（JSON）"],
  delete: ["Delete this essay", "删除当前文书"],
  deleteAll: ["Delete all App essays", "删除本应用全部文书"],
  exit: ["Lock workspace", "锁定工作台"],
  confirmText: [
    "I exported what I need and confirm soft deletion.",
    "我已导出所需内容，并确认软删除。",
  ],
  performDelete: ["Confirm deletion", "确认删除"],
};
function t(en: string, cn: string) {
  return zh ? cn : en;
}
function message(en: string, cn: string) {
  $("notice").textContent = t(en, cn);
}
function renderLocale() {
  document.documentElement.lang = zh ? "zh-Hans" : "en";
  for (const [id, c] of Object.entries(copy)) $(id).textContent = c[zh ? 1 : 0];
  feedback();
  update();
}
function currentReview() {
  return (
    data?.reviews.filter((r) => r.language === val("language")).at(-1) ??
    data?.reviews.at(-1)
  );
}
function update() {
  $("counter").textContent = t(
    `${val("draft").length}/${MAX_TEXT} characters`,
    `${val("draft").length}/${MAX_TEXT} 字符`,
  );
  const last = currentReview();
  $("stale").textContent =
    last && (last.versionId !== data?.versions.at(-1)?.id || dirty)
      ? t(
          "Feedback refers to an older saved version.",
          "当前反馈对应较早版本。",
        )
      : "";
}
function feedback() {
  const latest = currentReview();
  const node = $("feedback");
  node.replaceChildren();
  if (!latest) return;
  const p = document.createElement("p");
  p.textContent =
    t("Feedback version: ", "反馈版本：") +
    String(
      (data?.versions.findIndex((v) => v.id === latest.versionId) ?? -1) + 1,
    ) +
    " · " +
    new Date(latest.at).toLocaleString(zh ? "zh-CN" : "en") +
    " · " +
    { en: "English", "zh-CN": "中文", bilingual: "English + 中文" }[
      latest.language
    ] +
    (latest.model ? " · " + latest.model : "");
  node.append(p);
  const labels: Record<string, [string, string]> = {
    summary: ["Overview", "概览"],
    primary_priority: ["First revision priority", "首要修改重点"],
    revision_plan: ["Your revision checklist", "修改清单"],
    strengths: ["What works", "已有亮点"],
    categories: ["Writing review", "写作诊断"],
    passage_comments: ["Passage feedback", "段落反馈"],
    questions_for_student: ["Questions to explore", "值得思考的问题"],
    voice_check: ["Keep your own voice", "保持自己的声音"],
    limitations: ["Limits of this feedback", "反馈的局限"],
    material: ["Draft readiness", "草稿准备情况"],
    insufficient_reason: ["What is missing", "需要补充的内容"],
    prompt_alignment: ["Responding to the prompt", "回应题目"],
    title: ["Focus", "重点"],
    explanation: ["Why this matters", "原因"],
    task: ["Action", "行动"],
    why: ["Purpose", "目的"],
    point: ["Observation", "观察"],
    evidence_quote: ["Your words", "原文引用"],
    quote: ["Your words", "原文引用"],
    passage_quote: ["Your words", "原文引用"],
    zh_note: ["中文说明", "中文说明"],
    located: ["Quote found in draft", "引文可在草稿中找到"],
    key: ["Writing area", "写作方面"],
    label: ["Assessment", "评价"],
    status: ["Assessment", "评价"],
    next_step: ["Next step", "下一步"],
    observation: ["Observation", "观察"],
    why_it_matters: ["Why this matters", "原因"],
    revision_question: ["Question for your revision", "修改时思考的问题"],
    priority: ["Priority", "优先级"],
    question: ["Question", "问题"],
    note: ["Note", "说明"],
    computed: ["Draft length", "草稿长度"],
    wordCount: ["Estimated word count", "估算词数"],
    wordLimit: ["Word limit", "字数限制"],
    actual_tokens: ["Actual tokens returned by Anna", "Anna 返回的实际 tokens"],
    inputTokens: ["Input tokens", "输入 tokens"],
    outputTokens: ["Output tokens", "输出 tokens"],
    totalTokens: ["Total tokens", "合计 tokens"],
    sufficient: ["Ready for review", "可以分析"],
    insufficient: ["More material needed", "需要补充材料"],
    partly: ["Partly responds", "部分回应"],
    responds: ["Responds", "已回应"],
    not_yet: ["Not yet", "尚未回应"],
    unclear: ["Unclear", "不明确"],
    developing: ["Developing", "仍可完善"],
    needs_attention: ["Needs attention", "需要关注"],
    strong_foundation: ["Strong foundation", "基础扎实"],
    high: ["High", "高"],
    medium: ["Medium", "中"],
    low: ["Low", "低"],
    prompt_response: ["Prompt response", "回应题目"],
    specificity: ["Specificity", "具体细节"],
    reflection: ["Reflection", "反思"],
    structure_pacing: ["Structure and pacing", "结构与节奏"],
    clarity: ["Clarity", "清晰度"],
    voice: ["Voice", "个人声音"],
    opening_ending: ["Opening and ending", "开头与结尾"],
    concision: ["Concision", "简洁度"],
  };
  const label = (key: string) =>
    labels[key]?.[zh ? 1 : 0] ?? key.replaceAll("_", " ");
  function draw(value: unknown, parent: HTMLElement) {
    if (
      value === null ||
      value === undefined ||
      (Array.isArray(value) && !value.length)
    )
      return;
    if (Array.isArray(value)) {
      for (const x of value) {
        const box = document.createElement("blockquote");
        draw(x, box);
        parent.append(box);
      }
    } else if (value && typeof value === "object") {
      const order = [
        "summary",
        "primary_priority",
        "revision_plan",
        "strengths",
        "prompt_alignment",
        "categories",
        "passage_comments",
        "voice_check",
        "questions_for_student",
        "limitations",
        "material",
        "insufficient_reason",
        "computed",
        "title",
        "key",
        "label",
        "point",
        "task",
        "why",
        "explanation",
        "next_step",
        "quote",
        "evidence_quote",
        "observation",
        "why_it_matters",
        "revision_question",
        "priority",
        "zh_note",
        "located",
      ];
      const rank = (key: string) =>
        order.includes(key) ? order.indexOf(key) : order.length;
      for (const [k, v] of Object.entries(value).sort(
        (a, b) => rank(a[0]) - rank(b[0]),
      )) {
        if (v === null || v === undefined || (Array.isArray(v) && !v.length))
          continue;
        const d = document.createElement("details");
        d.open = [
          "primary_priority",
          "revision_plan",
          "summary",
          "title",
          "explanation",
          "task",
          "why",
        ].includes(k);
        const s = document.createElement("summary");
        s.textContent = label(k);
        d.append(s);
        draw(v, d);
        parent.append(d);
      }
    } else {
      const p = document.createElement("p");
      p.textContent =
        typeof value === "boolean"
          ? t(
              value ? "Yes" : "Not found — verify this quote.",
              value ? "是" : "未找到，请核查引文。",
            )
          : typeof value === "string"
            ? label(value)
            : String(value);
      parent.append(p);
    }
  }
  draw(latest.data, node);
  if (latest.usage) draw({ actual_tokens: latest.usage }, node);
}
function show() {
  if (!data) return;
  const v = data.versions.at(-1);
  input("prompt").value = v?.prompt ?? "";
  input("draft").value = v?.draft ?? "";
  input("retention").value = String(data.retentionDays);
  $("history").replaceChildren(
    ...data.versions.map(
      (v, i) =>
        new Option(
          `${i + 1} · ${new Date(v.at).toLocaleString(zh ? "zh-CN" : "en")}`,
          v.id,
        ),
    ),
  );
  input("history").value = v?.id ?? "";
  dirty = false;
  input("consent").checked = false;
  feedback();
  update();
}
function fresh() {
  data = undefined;
  etag = undefined;
  input("prompt").value = "";
  input("draft").value = "";
  $("feedback").replaceChildren();
  $("history").replaceChildren();
  dirty = false;
  input("consent").checked = false;
  update();
}
async function list() {
  const rows: { key: string }[] = [];
  let cursor: string | undefined;
  do {
    const r: Listed = result(
      await host.storage.list({
        prefix: PREFIX,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      }),
    );
    if (!Array.isArray(r?.items)) throw new Error("aps_required");
    rows.push(...r.items);
    cursor = r.next_cursor;
  } while (cursor);
  return rows;
}
async function refresh() {
  const rows = await list();
  const options = [];
  for (const row of rows) {
    const id = row.key.slice(PREFIX.length);
    const essay = await read(host, id);
    options.push(
      new Option(
        essay.data.versions.at(-1)?.prompt.slice(0, 65) ||
          t("Untitled essay", "未命名文书"),
        id,
      ),
    );
  }
  $("saved").replaceChildren(...options);
}
async function save() {
  validateInput(val("prompt"), val("draft"));
  if (!data) {
    data = {
      schema: 1,
      id: crypto.randomUUID(),
      retentionDays: Number(val("retention")),
      versions: [],
      reviews: [],
    };
  }
  const last = data.versions.at(-1);
  const changed =
    !last || last.prompt !== val("prompt") || last.draft !== val("draft");
  const next = structuredClone(data);
  if (changed)
    next.versions.push({
      id: crypto.randomUUID(),
      prompt: val("prompt"),
      draft: val("draft"),
      at: new Date().toISOString(),
    });
  if (next.versions.length > 30) throw new Error("version_limit_export_first");
  next.retentionDays = Number(val("retention"));
  etag = await write(host, next, etag);
  data = next;
  dirty = false;
  if (
    val("prompt") === next.versions.at(-1)?.prompt &&
    val("draft") === next.versions.at(-1)?.draft
  ) {
    show();
  } else {
    dirty = true;
    update();
  }
  await refresh();
  message("Version saved. No AI call made.", "版本已保存，没有调用 AI。");
}
function controls(on: boolean) {
  for (const id of [
    "save",
    "analyze",
    "open",
    "new",
    "sample",
    "restore",
    "delete",
    "deleteAll",
    "export",
    "exit",
    "performDelete",
  ])
    $<HTMLButtonElement>(id).disabled = on;
}
async function action(fn: () => Promise<void>) {
  if (busy || !active) return;
  busy = true;
  controls(true);
  $("notice").textContent = "";
  try {
    await fn();
  } catch (e) {
    const safe = errorCode(e);
    message(
      `Could not complete (${safe}). Your editor text is kept. Export/copy it before reopening. No automatic retry. If marked pending, confirm the old request ended with Anna support before any new analysis.`,
      `未完成（${safe}）。编辑区内容保留；重新打开前请导出或复制，不自动重试。如显示 pending，请先向 Anna 支持确认旧请求结束。`,
    );
  } finally {
    busy = false;
    controls(false);
  }
}
$("language").onchange = () => {
  feedback();
  update();
};
$("locale").onchange = () => {
  zh = val("locale") === "zh-CN";
  renderLocale();
};
$("enter").onclick = () => {
  if (!input("adult").checked) {
    message("Confirm the adult requirement first.", "请先确认符合成年要求。");
    return;
  }
  void action(async () => {
    const sdkPath = "/static/anna-apps/_sdk/latest/index.js";
    const { AnnaAppRuntime } = await import(sdkPath);
    host = await AnnaAppRuntime.connect();
    await probe(host);
    await refresh();
    $("gate").hidden = true;
    $("workspace").hidden = false;
  });
};
for (const id of ["prompt", "draft"])
  input(id).oninput = () => {
    dirty = true;
    input("consent").checked = false;
    update();
  };
$("save").onclick = () => void action(save);
$("new").onclick = () => {
  if (
    !dirty ||
    confirm(t("Discard unsaved editor changes?", "放弃尚未保存的修改？"))
  )
    fresh();
};
$("sample").onclick = () => {
  if (dirty && !confirm(t("Replace unsaved text?", "替换未保存内容？"))) return;
  fresh();
  input("prompt").value =
    "FICTIONAL EXAMPLE — Describe a moment when you learned to listen.";
  input("draft").value =
    "FICTIONAL EXAMPLE. At our imaginary community garden, I proposed moving every planter into one straight line. My teammate asked where the afternoon shade would fall. I had measured the paths but had never sat there after lunch. We spent an afternoon mapping the shadows together. I learned to ask what someone else had noticed before presenting my own plan. Now I begin meetings with a question and leave space for the answer.";
  dirty = true;
  update();
};
$("open").onclick = () =>
  void action(async () => {
    if (dirty && !confirm(t("Discard unsaved changes?", "放弃未保存修改？")))
      return;
    const r = await read(host, val("saved"));
    data = r.data;
    etag = r.etag;
    show();
  });
$("restore").onclick = () => {
  const v = data?.versions.find((v) => v.id === val("history"));
  if (!v) return;
  if (dirty && !confirm(t("Replace unsaved changes?", "替换未保存修改？")))
    return;
  input("prompt").value = v.prompt;
  input("draft").value = v.draft;
  dirty = true;
  input("consent").checked = false;
  update();
};
$("analyze").onclick = () =>
  void action(async () => {
    if (!input("consent").checked) throw new Error("consent_required");
    const consentPrompt = val("prompt"),
      consentDraft = val("draft");
    await save();
    if (val("prompt") !== consentPrompt || val("draft") !== consentDraft)
      throw new Error("consent_required");
    const v = structuredClone(data!.versions.at(-1)!);
    const current = await read(host, data!.id);
    if (current.data.pending) throw new Error("pending_analysis");
    data = current.data;
    etag = current.etag;
    const language = val("language") as FeedbackLanguage;
    const old = data.reviews.find(
      (r) => r.versionId === v.id && r.language === language,
    );
    if (old) {
      feedback();
      return;
    }
    const run = crypto.randomUUID();
    data.pending = { id: run, versionId: v.id, at: new Date().toISOString() };
    etag = await write(host, data, etag);
    discarded = false;
    $<HTMLButtonElement>("cancel").disabled = false;
    let settled = false;
    const started = Date.now();
    const timer = setInterval(() => {
      if (discarded) return;
      $("status").textContent = t(
        `Analyzing saved version · ${Math.floor((Date.now() - started) / 1000)} s · platform returns text when finished`,
        `正在分析已保存版本 · ${Math.floor((Date.now() - started) / 1000)} 秒 · 平台完成后返回内容`,
      );
    }, 1000);
    try {
      const response = await host.llm.complete(request(v, language), {
        timeoutMs: 600000,
      });
      settled = true;
      const parsed = parseFeedback(response, v);
      const r = await read(host, data.id);
      if (r.data.pending?.id !== run) throw new Error("analysis_conflict");
      data = r.data;
      etag = r.etag;
      delete data.pending;
      if (!discarded)
        data.reviews.push({
          versionId: v.id,
          language,
          data: parsed.data,
          usage: parsed.usage,
          model: parsed.model,
          at: new Date().toISOString(),
        });
      etag = await write(host, data, etag);
      feedback();
      update();
      message(
        discarded
          ? "Result discarded. Provider charges may still apply."
          : "Feedback saved for this version.",
        discarded
          ? "结果已丢弃，提供方仍可能计费。"
          : "反馈已保存，并关联此版本。",
      );
    } catch (e) {
      if (settled) {
        const current = await read(host, data!.id);
        if (current.data.pending?.id === run) {
          delete current.data.pending;
          etag = await write(host, current.data, current.etag);
          data = current.data;
        }
      }
      // Uncertain transport failures retain the marker. No automatic billable retry.
      throw e;
    } finally {
      clearInterval(timer);
      $("status").textContent = "";
      $<HTMLButtonElement>("cancel").disabled = true;
    }
  });
$("cancel").onclick = () => {
  discarded = true;
  $<HTMLButtonElement>("cancel").disabled = true;
  $("status").textContent = t(
    "Result will be discarded. Request may still run; wait before another analysis.",
    "将丢弃结果，请求可能继续运行；结束前不能再次分析。",
  );
};
$("export").onclick = () =>
  void action(async () => {
    const records = [];
    for (const row of await list()) {
      records.push((await read(host, row.key.slice(PREFIX.length))).data);
    }
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: "truedraft-anna-1",
            exportedAt: new Date().toISOString(),
            records,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "truedraft-anna-export.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
for (const id of ["delete", "deleteAll"])
  $(id).onclick = () => {
    deleteAll = id === "deleteAll";
    $("confirmRow").hidden = false;
    input("confirmDelete").checked = false;
  };
$("performDelete").onclick = () =>
  void action(async () => {
    if (!input("confirmDelete").checked) return;
    const rows = deleteAll
      ? await list()
      : data
        ? [{ key: PREFIX + data.id }]
        : [];
    for (const row of rows) {
      const r = await read(host, row.key.slice(PREFIX.length));
      result(await host.storage.delete({ key: row.key, if_match: r.etag }));
    }
    fresh();
    $("confirmRow").hidden = true;
    await refresh();
    message(
      "Soft deletion completed; permanent purge is not verified.",
      "软删除完成，无法验证永久清除。",
    );
  });
$("exit").onclick = () => {
  fresh();
  active = false;
  $("workspace").hidden = true;
  $("gate").hidden = false;
  input("adult").checked = false;
  location.reload();
};
window.addEventListener("focus", () => {
  if (host && !busy && data)
    void action(async () => {
      const r = await read(host, data!.id);
      if (r.etag !== etag)
        message(
          "Another window changed this essay. Keep your text, then reopen; saving will report a conflict.",
          "其他窗口更新了此文书。请保留当前文字后重新打开；直接保存会提示冲突。",
        );
    });
});
renderLocale();
