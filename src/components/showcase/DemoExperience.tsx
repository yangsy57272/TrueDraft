"use client";
import { useState } from "react";
import {
  DEMO_DATE,
  DEMO_DRAFT,
  DEMO_QUOTE,
  DEMO_REVISION,
  DEMO_SCHOOLS,
  demoHub,
} from "../../content/demo-scenario";
import { buildTodayPlan } from "../../lib/today-plan";
import { suggestFit } from "../../lib/fit";
import { findQuoteEvidence } from "../../lib/feedback-evidence";
import report from "../../content/quality-report.json";
import "./showcase.css";

const REPO = "https://github.com/yangsy57272/TrueDraft";
const initialDone = [
  "lakeside:verify:date-lakeside",
  "northfield:verify:date-northfield",
  "lakeside:check:transcript-lakeside",
  "northfield:check:transcript-northfield",
];
type Step = "colleges" | "plan" | "essay" | "quality";
export function DemoExperience({
  initialLocale = "en",
  initialStep = "colleges",
  videoSrc = "/showcase/demo-tour.webm",
}: {
  initialLocale?: string;
  initialStep?: Step;
  videoSrc?: string;
}) {
  const [locale, setLocale] = useState(initialLocale);
  const zh = locale === "zh-CN";
  const say = (en: string, cn: string) => (zh ? cn : en);
  const [step, setStep] = useState<Step>(initialStep);
  const [selected, setSelected] = useState<string[]>([
    "lakeside",
    "northfield",
  ]);
  const [completed, setCompleted] = useState<string[]>(initialDone);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(false);
  const [revision, setRevision] = useState(false);
  const [notice, setNotice] = useState("");
  const hub = demoHub(selected, completed);
  const today = buildTodayPlan(hub);
  const quote = findQuoteEvidence(DEMO_DRAFT, DEMO_QUOTE)!;
  const feeTotal = DEMO_SCHOOLS.filter((s) => selected.includes(s.id)).reduce(
    (n, s) => n + (s.fee ?? 0),
    0,
  );
  const missingFees = DEMO_SCHOOLS.filter(
    (s) => selected.includes(s.id) && s.fee == null,
  ).length;
  const steps: { key: Step; en: string; zh: string; number: string }[] = [
    {
      key: "colleges",
      en: "Find your colleges",
      zh: "找到适合的学校",
      number: "01",
    },
    { key: "plan", en: "Make today count", zh: "明确今天的重点", number: "02" },
    { key: "essay", en: "Keep your voice", zh: "保留自己的声音", number: "03" },
    {
      key: "quality",
      en: "Check the evidence",
      zh: "核对质量与依据",
      number: "04",
    },
  ];
  function reset() {
    setSelected(["lakeside", "northfield"]);
    setCompleted(initialDone);
    setQuery("");
    setHighlight(false);
    setRevision(false);
    setStep("colleges");
    setNotice(
      say(
        "Demo reset. Nothing was saved to an account.",
        "演示已重置，没有保存到任何账号。",
      ),
    );
  }
  function changeStep(next: Step) {
    setStep(next);
    setNotice("");
  }
  return (
    <div className="td-demo" lang={zh ? "zh-Hans" : "en"}>
      <div className="td-shell">
        <header className="td-header">
          <a className="td-brand" href={REPO} aria-label="TrueDraft on GitHub">
            <span aria-hidden="true">
              T<span className="td-brand-dot">.</span>
            </span>
            TrueDraft
          </a>
          <div className="td-header-actions">
            <button
              onClick={() => setLocale(zh ? "en" : "zh-CN")}
              aria-label={say("Switch to Chinese", "切换为英文")}
            >
              {zh ? "English" : "简体中文"}
            </button>
            <a className="td-button td-button-dark" href={`${REPO}/releases`}>
              {say("Download the app", "下载完整应用")} ↗
            </a>
          </div>
        </header>
        <div className="td-demo-notice">
          <span className="td-dot" aria-hidden="true" />
          {say("FICTIONAL DEMO", "虚构演示")}
          <span>
            {say(
              "No sign-in · No AI calls · Changes stay in this tab until reload",
              "无需注册 · 不调用 AI · 更改仅在本标签页刷新前保留",
            )}
          </span>
        </div>
        <section className="td-hero">
          <div>
            <p className="td-eyebrow">
              {say(
                "YOUR APPLICATION, WITH A CLEARER NEXT STEP",
                "让申请的下一步更清晰",
              )}
            </p>
            <h1>
              {say("A little less overwhelm.", "申请少一点慌乱。")}
              <br />
              <em>{say("A lot more direction.", "下一步多一点把握。")}</em>
            </h1>
            <p className="td-lede">
              {say(
                "Meet Alex, a fictional student exploring computing and community design. Walk through a college shortlist, a realistic day plan, and one thoughtful essay revision.",
                "跟随虚构学生 Alex，探索计算机与社区设计方向。体验选校清单、当天计划，以及一次有依据的文书修改。",
              )}
            </p>
          </div>
          <aside className="td-persona">
            <p className="td-eyebrow">{say("THE DEMO PROFILE", "演示档案")}</p>
            <div className="td-avatar" aria-hidden="true">
              A
            </div>
            <h2>Alex</h2>
            <p>
              {say(
                "Curious about how people and systems work together.",
                "好奇人与系统怎样协作。",
              )}
            </p>
            <div className="td-tags">
              <span>{say("Repair club", "维修社团")}</span>
              <span>{say("Mapping", "地图绘制")}</span>
              <span>{say("SAT 1420 · fictional", "SAT 1420 · 虚构")}</span>
            </div>
          </aside>
        </section>
        <details className="td-tour">
          <summary>
            {say("Watch the short walkthrough", "观看简短操作演示")}
          </summary>
          <p>
            {say(
              "Recorded interaction with fictional data; no narration or live AI.",
              "虚构数据的实际操作录屏，无旁白，不涉及实时 AI。",
            )}
          </p>
          <video
            controls
            preload="none"
            aria-label={say(
              "TrueDraft fictional demo walkthrough",
              "TrueDraft 虚构案例操作演示",
            )}
            src={videoSrc}
          >
            Your browser does not support this video.{" "}
            <a href={videoSrc}>Download the walkthrough</a>.
          </video>
        </details>
        <nav className="td-steps" aria-label={say("Demo steps", "演示步骤")}>
          {steps.map((item) => (
            <button
              aria-current={step === item.key ? "step" : undefined}
              onClick={() => changeStep(item.key)}
              key={item.key}
            >
              <span>{item.number}</span>
              {zh ? item.zh : item.en}
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </nav>
        <p role="status" className="td-status">
          {notice}
        </p>
        {step === "colleges" && (
          <section aria-labelledby="demo-colleges-title">
            <div className="td-section-heading">
              <div>
                <p className="td-eyebrow">
                  {say("EXPLORE BEFORE YOU DECIDE", "先探索，再决定")}
                </p>
                <h2 id="demo-colleges-title">
                  {say(
                    "Build a shortlist you understand.",
                    "建立一份你真正了解的选校清单。",
                  )}
                </h2>
              </div>
              <label className="td-search">
                {say("Search fictional colleges", "搜索虚构学校")}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={say("Try Lakeside…", "试试 Lakeside…")}
                />
              </label>
            </div>
            <div className="td-workspace">
              <div className="td-school-grid">
                {DEMO_SCHOOLS.filter((s) =>
                  `${s.name} ${s.zh} ${s.subject} ${s.subjectZh}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                ).map((s) => {
                  const fit = suggestFit(
                    s.rate,
                    {
                      sat: s.sat
                        ? { low: s.sat[0], high: s.sat[1], approximate: false }
                        : null,
                      act: null,
                    },
                    { sat: 1420, act: null, testPlan: "submit" },
                  );
                  const onList = selected.includes(s.id);
                  return (
                    <article
                      className="td-card td-school"
                      key={s.id}
                      style={{ borderTopColor: s.color }}
                    >
                      <div className="td-card-top">
                        <span className="td-label">
                          {say("Fictional U.S. college", "虚构美国学校")}
                        </span>
                        <span
                          className={`td-pill ${fit?.category === "reach" ? "td-pill-rose" : ""}`}
                        >
                          {fit
                            ? {
                                reach: "Reach",
                                target: "Target",
                                likely: "Safety",
                              }[fit.category]
                            : say("Unassessed", "未评估")}
                        </span>
                      </div>
                      <h3>{zh ? s.zh : s.name}</h3>
                      <p>{zh ? s.subjectZh : s.subject}</p>
                      <dl className="td-facts">
                        <div>
                          <dt>{say("Admission rate", "录取率")}</dt>
                          <dd>
                            {s.rate == null
                              ? say("Not available", "未提供")
                              : `${s.rate}%`}
                          </dd>
                        </div>
                        <div>
                          <dt>{say("SAT middle 50%", "SAT 中间50%范围")}</dt>
                          <dd>
                            {s.sat
                              ? s.sat.join("–")
                              : say("Not available", "未提供")}
                          </dd>
                        </div>
                      </dl>
                      <details className="td-evidence">
                        <summary>
                          {say("Why this grouping?", "为什么这样分组？")}
                        </summary>
                        <p>
                          {s.rate == null
                            ? say(
                                "No admission rate is available, so the rules make no assessment. Missing data does not mean a school is easy to enter.",
                                "录取率缺失，因此规则不作评估。缺失数据不代表容易录取。",
                              )
                            : s.rate < 15
                              ? say(
                                  "The demo admission rate is below 15%, so the shared rule keeps this school as Reach regardless of the score.",
                                  "演示录取率低于15%，共用规则使其保持 Reach，不因成绩改变。",
                                )
                              : say(
                                  "A 42% demo admission rate starts at Target. Alex’s fictional SAT 1420 is inside 1280–1450, so no adjustment is made.",
                                  "演示录取率42%对应 Target；Alex 的虚构 SAT 1420 在1280–1450内，因此不调整。",
                                )}
                        </p>
                        <p>
                          <strong>
                            {say("Source & period:", "来源与时期：")}
                          </strong>{" "}
                          {say(
                            "Invented demonstration values, scenario edition 2026-11-20. No real institution or official data source.",
                            "虚构演示数值，场景版本2026-11-20。不对应真实学校或官方数据。",
                          )}
                        </p>
                        <p>
                          {say(
                            "Programme-level admission, international admission and affordability are not assessed. Groupings do not predict admission.",
                            "未评估专业录取、国际生录取或个人可负担性。分组不预测录取。",
                          )}
                        </p>
                      </details>
                      <button
                        className={`td-button ${onList ? "td-button-soft" : "td-button-dark"}`}
                        aria-pressed={onList}
                        onClick={() =>
                          setSelected(
                            onList
                              ? selected.filter((id) => id !== s.id)
                              : [...selected, s.id],
                          )
                        }
                      >
                        {onList
                          ? say(
                              "✓ On your demo list · remove",
                              "✓ 已加入演示清单 · 移除",
                            )
                          : say("+ Add to demo list", "+ 加入演示清单")}
                      </button>
                    </article>
                  );
                })}
                {!DEMO_SCHOOLS.some((s) =>
                  `${s.name} ${s.zh} ${s.subject} ${s.subjectZh}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                ) && (
                  <p className="td-card">
                    {say(
                      "No fictional colleges match. Clear your search to see all three.",
                      "没有匹配的虚构学校，清空搜索可查看全部三所。",
                    )}
                  </p>
                )}
              </div>
              <aside className="td-card td-summary">
                <p className="td-eyebrow">
                  {say("YOUR DEMO LIST", "你的演示清单")}
                </p>
                <p className="td-large-number">
                  {selected.length}
                  <span>{say("colleges", "所学校")}</span>
                </p>
                <p>
                  {selected.length
                    ? say(
                        "One shared Common App statement, with each college’s requirements checked separately.",
                        "一篇通用 Common App 文书；各学校要求仍须分别核对。",
                      )
                    : say(
                        "Choose a fictional college to start your demo plan.",
                        "选择一所虚构学校，开始演示计划。",
                      )}
                </p>
                <hr />
                <p className="td-label">
                  {say("Sample application fees only", "仅演示申请费")}
                </p>
                <p className="td-fee">
                  ${feeTotal}{" "}
                  <small>
                    USD
                    {missingFees
                      ? say(
                          ` + ${missingFees} unknown`,
                          ` + ${missingFees}项未知`,
                        )
                      : ""}
                  </small>
                </p>
                <p className="td-small">
                  {say(
                    "Fictional costs; excludes tuition, tests and documents. Unknown is never treated as free.",
                    "虚构费用，不含学费、考试和材料。未知费用不当作免费。",
                  )}
                </p>
                <button
                  className="td-button td-button-dark"
                  onClick={() => changeStep("plan")}
                >
                  {say("See my next steps →", "看看下一步 →")}
                </button>
              </aside>
            </div>
          </section>
        )}
        {step === "plan" && (
          <section aria-labelledby="demo-plan-title">
            <div className="td-section-heading">
              <div>
                <p className="td-eyebrow">
                  {say("ONE ACHIEVABLE DAY", "从做得到的一天开始")}
                </p>
                <h2 id="demo-plan-title">
                  {say(
                    "Your focus, with room to breathe.",
                    "抓住重点，也留出余地。",
                  )}
                </h2>
              </div>
              <span className="td-pill">
                {DEMO_DATE.slice(0, 10)} · UTC · {say("simulated", "模拟日期")}
              </span>
            </div>
            <p className="td-intro">
              {say(
                "Alex has already handled the two original schools’ requirements checks and transcript tasks. The remaining plan uses 6 hours per week across 5 weekdays, with breaks. All deadlines are fictional.",
                "Alex 已处理原先两所学校的要求核查与成绩单任务。剩余计划按每周6小时、5个工作日安排，并留出休息。全部截止日期均为虚构。",
              )}
            </p>
            <div className="td-metrics">
              <div>
                <strong>{today.availableMinutes}</strong>
                <span>
                  {say("allocated work minutes today", "今天已分配的工作分钟")}
                </span>
              </div>
              <div>
                <strong>{today.actions.length}</strong>
                <span>{say("ready next steps", "个就绪的下一步")}</span>
              </div>
              <div>
                <strong>{today.blocked.length}</strong>
                <span>
                  {say("steps waiting on earlier work", "步等待前置任务")}
                </span>
              </div>
            </div>
            <div className="td-plan-grid">
              {today.actions.map(({ task, minutes, partial, schools }, i) => (
                <article className="td-card" key={task.id}>
                  <p className="td-eyebrow">
                    0{i + 1} · {minutes} {say("MINUTES", "分钟")}
                  </p>
                  <h3>
                    {task.id.startsWith("global:")
                      ? say(
                          (
                            {
                              brainstorm: "Find material",
                              draft: "Draft",
                              revise: "Revise",
                              review: "Review",
                            } as Record<string, string>
                          )[task.kind] + " · shared statement",
                          (
                            {
                              brainstorm: "整理素材",
                              draft: "起草",
                              revise: "修改",
                              review: "最终检查",
                            } as Record<string, string>
                          )[task.kind] + " · 通用文书",
                        )
                      : task.kind === "verify"
                        ? say("Verify application requirements", "核实申请要求")
                        : say(
                            "Prepare your application material",
                            "准备申请材料",
                          )}
                  </h3>
                  <p>{schools.join(" · ")}</p>
                  {schools.length > 1 && (
                    <p className="td-callout">
                      {say(
                        `One task supports ${schools.length} schools.`,
                        `一项任务支持 ${schools.length} 所学校。`,
                      )}
                    </p>
                  )}
                  <details className="td-evidence">
                    <summary>
                      {say(
                        "Why now, and what comes next?",
                        "为什么先做这个，之后做什么？",
                      )}
                    </summary>
                    <p>
                      {say(
                        `Suggested work target: ${task.targetDate}. This is a work target derived from an invented deadline, not an official due date.`,
                        `建议工作目标：${task.targetDate}，由虚构截止日期推算，不是官方截止要求。`,
                      )}
                    </p>
                    <p>
                      {say(
                        "Brainstorming comes before drafting, revision and final review. Completion unlocks the next stage; it never submits an application.",
                        "先整理素材，再起草、修改和最终检查。完成后会解锁下一阶段，不会提交申请。",
                      )}
                    </p>
                    {partial && (
                      <p>
                        {say(
                          "This is a partial work session. Mark the task handled only when the whole task is finished.",
                          "这只是部分工作时段，整个任务完成后才标记已处理。",
                        )}
                      </p>
                    )}
                  </details>
                  <button
                    className="td-button td-button-dark"
                    onClick={() => {
                      setCompleted([...completed, task.id]);
                      setNotice(
                        say(
                          "Demo task handled. The plan has recalculated; reload or reset to undo.",
                          "演示任务已处理，计划已重新计算；刷新或重置可恢复。",
                        ),
                      );
                    }}
                  >
                    {say("Mark task handled", "标记任务已处理")}
                  </button>
                </article>
              ))}
            </div>
            {!today.actions.length && (
              <p className="td-card">
                {say(
                  "No ready work is allocated. Add a fictional college or reset the demo to explore the plan.",
                  "没有已分配的就绪任务。请添加虚构学校，或重置演示。",
                )}
              </p>
            )}
            <details className="td-card td-blocked">
              <summary>
                {say("See writing dependencies", "查看写作前置关系")}
              </summary>
              <ul>
                {today.blocked.slice(0, 6).map(({ task, dependencies }) => (
                  <li key={task.id}>
                    {task.title} ← {dependencies.map((d) => d.title).join("; ")}
                  </li>
                ))}
              </ul>
            </details>
            <button
              className="td-button td-button-outline"
              onClick={() => changeStep("essay")}
            >
              {say("Explore an essay revision →", "体验一次文书修改 →")}
            </button>
          </section>
        )}
        {step === "essay" && (
          <section aria-labelledby="demo-essay-title">
            <div className="td-section-heading">
              <div>
                <p className="td-eyebrow">
                  {say("FEEDBACK YOU CAN TRACE", "有原文可查的反馈")}
                </p>
                <h2 id="demo-essay-title">
                  {say("The thinking stays yours.", "思考和表达，始终属于你。")}
                </h2>
              </div>
              <span className="td-pill">
                {say(
                  "Hand-written example · not live AI",
                  "人工编写示例 · 非实时 AI",
                )}
              </span>
            </div>
            <div className="td-essay-grid">
              <article className="td-card td-paper">
                <p className="td-label">
                  {say(
                    "Fictional source draft · version 1",
                    "虚构原稿 · 版本1",
                  )}
                </p>
                <h3>{say("The repair table", "维修桌旁")}</h3>
                {DEMO_DRAFT.split("\n\n").map((p, i) => (
                  <p className="td-prose" key={i}>
                    {highlight && i === 2 ? (
                      <>
                        <mark>{DEMO_QUOTE}</mark>
                        {p.slice(DEMO_QUOTE.length)}
                      </>
                    ) : (
                      p
                    )}
                  </p>
                ))}
                {revision && (
                  <div className="td-revision">
                    <p className="td-label">
                      {say(
                        "Illustrative student revision · version 2 ending",
                        "示意性的学生修改 · 版本2结尾",
                      )}
                    </p>
                    <p className="td-prose">{DEMO_REVISION}</p>
                    <p className="td-small">
                      {say(
                        "A hand-written fictional comparison, not an AI rewrite or measured improvement.",
                        "人工编写的虚构对照，并非 AI 代写或经过评测的改进。",
                      )}
                    </p>
                  </div>
                )}
              </article>
              <aside>
                <article className="td-card td-feedback">
                  <p className="td-eyebrow">
                    {say("ONE USEFUL REVISION QUESTION", "一个具体的修改问题")}
                  </p>
                  <h3>
                    {say(
                      "Show the change in how you work.",
                      "写清你做事的方法怎样变了。",
                    )}
                  </h3>
                  <p>
                    {say(
                      "The repair scene already shows collaboration. The ending names broad qualities but leaves out the change in your reasoning.",
                      "维修场景已经体现合作。结尾概括了宽泛品质，却没有写清思考方式发生的变化。",
                    )}
                  </p>
                  <blockquote>“{DEMO_QUOTE}”</blockquote>
                  <button
                    className="td-button td-button-soft"
                    onClick={() => setHighlight(!highlight)}
                    aria-pressed={highlight}
                  >
                    {highlight
                      ? say("Hide source highlight", "关闭原句高亮")
                      : say("Locate this in the draft", "在原稿中定位这句话")}
                  </button>
                  {highlight && (
                    <p className="td-small" role="status">
                      {say(
                        `Paragraph ${quote.paragraph} · source characters ${quote.start + 1}–${quote.end}. A text match verifies location, not the quality of this advice.`,
                        `第${quote.paragraph}段 · 原文位置${quote.start + 1}–${quote.end}。文字匹配只能验证位置，不能证明建议正确。`,
                      )}
                    </p>
                  )}
                  <div className="td-callout">
                    <strong>{say("Try asking yourself", "试着问自己")}</strong>
                    <p>
                      {say(
                        "What did you do differently at the next repair session? Which small action would let a reader see that change?",
                        "下一次维修时，你的做法有什么不同？哪个小动作能让读者看见这种变化？",
                      )}
                    </p>
                  </div>
                  <button
                    className="td-button td-button-dark"
                    onClick={() => setRevision(!revision)}
                    aria-pressed={revision}
                  >
                    {revision
                      ? say("Hide revision comparison", "关闭修改对照")
                      : say(
                          "Compare an illustrative revision",
                          "对照一个示意修改",
                        )}
                  </button>
                </article>
                <p className="td-small">
                  {say(
                    "Your actual experiences and decisions belong in your essay. The full app saves versions and tracks revision tasks without replacing your draft.",
                    "文书应包含你真实的经历与决定。完整应用可以保存版本、跟踪修改任务，不会用反馈替换原稿。",
                  )}
                </p>
              </aside>
            </div>
          </section>
        )}
        {step === "quality" && (
          <section aria-labelledby="demo-quality-title">
            <div className="td-section-heading">
              <div>
                <p className="td-eyebrow">
                  {say("EVIDENCE OVER PROMISES", "用证据说明能力与边界")}
                </p>
                <h2 id="demo-quality-title">
                  {say(
                    "See what we actually checked.",
                    "看看我们实际检查了什么。",
                  )}
                </h2>
              </div>
              <span className="td-pill">
                {say("Deterministic fixtures", "确定性回归样例")}
              </span>
            </div>
            <div className="td-quality-summary">
              <div className="td-card">
                <p className="td-large-number">
                  {report.passed}
                  <span>/ {report.total}</span>
                </p>
                <h3>{say("Fixture checks passed", "项样例检查通过")}</h3>
                <p>
                  {say(
                    "Small, public regression cases exercising production rules. Not an AI accuracy score, user study or independent certification.",
                    "用少量公开回归样例检查实际产品规则。这不是 AI 准确率、用户研究或独立认证。",
                  )}
                </p>
              </div>
              <div className="td-card">
                <h3>{say("Not yet measured", "尚未测量")}</h3>
                <ul>
                  <li>
                    {say(
                      "Live model feedback quality or new-fact invention",
                      "实时模型的反馈质量或编造新事实的情况",
                    )}
                  </li>
                  <li>
                    {say(
                      "Educator judgment and Chinese-language nuance",
                      "教育者判断与中文表达细节",
                    )}
                  </li>
                  <li>
                    {say(
                      "Real student outcomes or usability-study results",
                      "真实学生效果或可用性研究结果",
                    )}
                  </li>
                </ul>
                <a href={`${REPO}/blob/main/docs/QUALITY.md`}>
                  {say(
                    "Methods, limitations & reproduction →",
                    "查看方法、局限与复现步骤 →",
                  )}
                </a>
              </div>
            </div>
            <div className="td-quality-list">
              {report.rows.map((row) => (
                <details className="td-card" key={row.id}>
                  <summary>
                    <span className={row.passed ? "td-check" : "td-fail"}>
                      {row.passed ? "✓" : "!"}
                    </span>
                    {zh ? row.zh : row.en}
                    <span className="td-label">
                      {row.passed ? say("PASS", "通过") : say("FAIL", "失败")}
                    </span>
                  </summary>
                  <dl className="td-facts">
                    <div>
                      <dt>{say("Fictional fixture input", "虚构测试输入")}</dt>
                      <dd>{row.input}</dd>
                    </div>
                    <div>
                      <dt>{say("Expected / observed", "预期／实际")}</dt>
                      <dd>
                        {row.expected} / {row.actual}
                      </dd>
                    </div>
                  </dl>
                </details>
              ))}
            </div>
            <p className="td-small td-digest">
              {say("Suite", "套件")} {report.suiteVersion} · SHA-256{" "}
              {report.sourceDigest}
            </p>
          </section>
        )}
        <section className="td-bottom-cta">
          <div>
            <p className="td-eyebrow">
              {say("READY TO MAKE IT YOURS?", "准备好开始自己的申请了吗？")}
            </p>
            <h2>
              {say(
                "Your story. Your voice. Your next step.",
                "你的故事，你的声音，你的下一步。",
              )}
            </h2>
            <p>
              {say(
                "The full app keeps your drafts and plans on your device. AI coaching is optional; cloud provider charges may apply.",
                "完整桌面版把草稿与计划保存在本机。AI 辅导为可选功能，云端服务可能收费。",
              )}
            </p>
          </div>
          <a className="td-button td-button-dark" href={`${REPO}/releases`}>
            {say("Download TrueDraft", "下载 TrueDraft")} ↗
          </a>
        </section>
        <footer className="td-footer">
          <p>
            {say(
              "All students, schools, figures and dates in this demo are fictional. Nothing here is an admission or affordability guarantee.",
              "本演示中的学生、学校、数值与日期全部虚构，不构成录取或可负担性保证。",
            )}
          </p>
          <div>
            <button onClick={reset}>{say("Reset demo", "重置演示")}</button>
            <a href={REPO}>GitHub ↗</a>
            <a href={`${REPO}/blob/main/docs/USER_TESTING.md`}>
              {say("Help test TrueDraft", "参与体验测试")}
            </a>
            <a href={`${REPO}/blob/main/LICENSE`}>MIT</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
