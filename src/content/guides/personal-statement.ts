/*
 * TrueDraft's personal statement guide. Original writing by TrueDraft (not adapted from any paid
 * course or third-party guide). External resources are linked, never copied.
 *
 * The Common App prompts are quoted from Common App, which has used these seven prompts since the
 * 2021–22 cycle; the page tells students to confirm them on commonapp.org each year.
 */

export type GuideStep = { title: string; body: string[]; tryThis?: string[] };
export type Guide = {
  title: string;
  intro: string;
  factsTitle: string;
  facts: string[];
  promptsTitle: string;
  promptsNote: string;
  promptsTip: string;
  stepsTitle: string;
  steps: GuideStep[];
  structuresTitle: string;
  structures: { name: string; when: string; shape: string[] }[];
  pitfallsTitle: string;
  pitfalls: { bad: string; better: string }[];
  intlTitle: string;
  intl: string[];
  checklistTitle: string;
  checklist: string[];
  honestyTitle: string;
  honesty: string;
  toolsTitle: string;
  startEssay: string;
  brainstorm: string;
  sample: string;
  furtherTitle: string;
  furtherNote: string;
};

export const COMMON_APP_PROMPTS = [
  "Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.",
  "The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?",
  "Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?",
  "Reflect on something that someone has done for you that has made you happy or thankful in a surprising way. How has this gratitude affected or motivated you?",
  "Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.",
  "Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you? What or who do you turn to when you want to learn more?",
  "Share an essay on any topic of your choice. It can be one you've already written, one that responds to a different prompt, or one of your own design.",
];

/** Further reading: external, attributed links only. Nothing from these sites is copied into TrueDraft. */
export const FURTHER_READING = [
  { name: "Common App — first-year essay prompts", url: "https://www.commonapp.org/", by: "Common App" },
  { name: "College Essay Guy — free blog articles and guides", url: "https://www.collegeessayguy.com/blog", by: "College Essay Guy (Ethan Sawyer)" },
  { name: "University of California — personal insight questions", url: "https://admissions.universityofcalifornia.edu/how-to-apply/applying-as-a-freshman/personal-insight-questions.html", by: "University of California" },
];

const en: Guide = {
  title: "Personal statement guide",
  intro:
    "Your personal statement is the one place in the application where admissions readers hear you directly. This guide walks you from a blank page to a finished draft — in your own words, with no one writing it for you.",
  factsTitle: "The basics",
  facts: [
    "Common App: one essay of 250–650 words, sent to every Common App college you apply to.",
    "Readers spend only a few minutes on it, alongside your grades, activities, and recommendations. It should show something those parts can't.",
    "There is no “right” topic. A small, specific moment usually works better than a big, general one.",
    "The prompt matters less than you think: prompt 7 lets you write about anything, so choose the story first and the prompt last.",
  ],
  promptsTitle: "Common App prompts",
  promptsNote: "Common App has used these seven prompts since the 2021–22 cycle. Confirm them on commonapp.org before you submit.",
  promptsTip: "Tip: draft first, then pick the prompt your essay fits best.",
  stepsTitle: "Step by step",
  steps: [
    {
      title: "Collect raw material",
      body: [
        "Spend 30 minutes listing things without judging them: objects you keep, places you go when you need to think, people who changed how you see something, arguments you keep having with yourself, things you do that nobody asked you to do.",
        "Write fragments, not sentences. Quantity first — most of the list will never be used, and that's fine.",
      ],
      tryThis: ["What do you know a lot about that most people your age don't?", "When did you change your mind about something important?", "What does an ordinary Tuesday look like for you, honestly?"],
    },
    {
      title: "Find what only you can say",
      body: [
        "Circle three items that feel true and specific. For each, ask: what does this show about how I think, what I value, or how I've changed?",
        "Choose the one that reveals something not already visible in your activities list and transcript. If a stranger could have written it, keep looking.",
      ],
    },
    {
      title: "Pick a shape",
      body: [
        "Most strong essays take one of two shapes (see the comparison below): one story told over time, or several moments tied together by one thread. Pick the one that fits your material — don't force a dramatic story you don't have.",
      ],
    },
    {
      title: "Write a fast, messy first draft",
      body: [
        "Write without stopping to edit. Go long — 800–1,000 words is fine; you will cut later.",
        "Use concrete details (what you saw, said, held) and, for every moment, a sentence of reflection: what you understood then, or understand now.",
      ],
    },
    {
      title: "Revise in passes",
      body: [
        "Pass 1 — meaning: can you state the essay's point in one sentence? Does every paragraph serve it?",
        "Pass 2 — structure: move, merge, or delete paragraphs. Make the opening put the reader inside a moment or idea quickly.",
        "Pass 3 — sentences: cut filler, replace vague words with specific ones, read it aloud, and get under 650 words.",
        "Leave a day between passes when you can. Save a version before each pass so you can compare.",
      ],
    },
    {
      title: "Get feedback without losing your voice",
      body: [
        "Ask one or two readers who know you: “What do you learn about me? Where did you lose interest?” — not “Is it good?”.",
        "Take notes on questions and confusion, then make every change yourself. If it stops sounding like you, undo it.",
      ],
    },
  ],
  structuresTitle: "Two common shapes",
  structures: [
    {
      name: "One story, over time (narrative)",
      when: "You have a real turning point — a challenge, decision, or change you can show step by step.",
      shape: ["Where you started (briefly)", "The moment things shifted", "What you did and how you thought about it", "Who you are now, and what you carry forward"],
    },
    {
      name: "Several moments, one thread (thematic)",
      when: "No single dramatic event — but a quality, interest, or value that shows up across different parts of your life.",
      shape: ["Name or hint at the thread", "3–5 short, varied moments, each showing a different side of it", "What the thread says about how you think or what you value", "Where it points next"],
    },
  ],
  pitfallsTitle: "Common pitfalls",
  pitfalls: [
    { bad: "Your activities list, rewritten as paragraphs.", better: "Go deep on one or two things, and say why they matter to you." },
    { bad: "A hard experience described in detail, with little reflection.", better: "Keep the description short; spend most words on how you responded and what you understand now." },
    { bad: "Big words and a famous quotation to sound impressive.", better: "Write the way you'd explain it to a thoughtful friend." },
    { bad: "An essay mostly about someone else (a grandparent, a coach).", better: "Keep them in it, but keep the focus on what you did, thought, and learned." },
    { bad: "A last line that says “…and that's why I want to study X.”", better: "End on an image or thought that is yours; save the “why us” for supplements." },
  ],
  intlTitle: "For international applicants",
  intl: [
    "Give one sentence of context when readers may not know a system (e.g. gaokao, boarding school routines), then move on.",
    "Being modest in tone is fine — but say clearly what you did. “We” can hide your role; use “I” when it was you.",
    "Draft in whichever language helps you think. Then rewrite in English yourself; translation tools flatten your voice.",
  ],
  checklistTitle: "Before you submit",
  checklist: [
    "I can state my essay's point in one sentence.",
    "It shows something that isn't elsewhere in my application.",
    "Every paragraph has at least one specific detail.",
    "There is reflection, not just events.",
    "It sounds like me when I read it aloud.",
    "It is 650 words or fewer and I have proofread it.",
    "Every sentence was written by me.",
  ],
  honestyTitle: "TrueDraft's promise",
  honesty:
    "TrueDraft never writes or rewrites your essay. Its feedback asks questions, points to places to develop, and explains why — the words stay yours, which is also what colleges require.",
  toolsTitle: "Use TrueDraft for this",
  startEssay: "Start my personal statement",
  brainstorm: "Brainstorm in the essay workspace",
  sample: "See sample feedback",
  furtherTitle: "Further reading (external sites)",
  furtherNote: "Links open other websites. TrueDraft doesn't copy their content and isn't affiliated with them.",
};

const zh: Guide = {
  title: "主文书（Personal Statement）指南",
  intro: "主文书是整份申请中招生官唯一能直接“听到你说话”的地方。这份指南带你从一张白纸走到完整的初稿——用你自己的话，没有人替你写。",
  factsTitle: "基本信息",
  facts: [
    "Common App：一篇 250–650 词的文书，会发给你通过 Common App 申请的每一所学校。",
    "招生官只会花几分钟阅读，同时还会看你的成绩、活动和推荐信。主文书要展现这些材料展现不了的东西。",
    "没有“正确”的题材。一个小而具体的瞬间，通常比宏大而笼统的主题更有力量。",
    "题目没有你想的那么重要：第 7 题允许写任何主题，所以先确定故事，最后再选题目。",
  ],
  promptsTitle: "Common App 题目",
  promptsNote: "自 2021–22 申请季起 Common App 一直使用这七道题。提交前请在 commonapp.org 上确认。题目为官方英文原文。",
  promptsTip: "建议：先写初稿，再选最契合的题目。",
  stepsTitle: "分步写作",
  steps: [
    {
      title: "收集素材",
      body: [
        "花 30 分钟列清单，先不要评判：你珍藏的物件、需要思考时会去的地方、改变你看法的人、你常和自己争论的问题、没人要求你却主动去做的事。",
        "写碎片，不写完整句子。先求数量——大部分内容最终不会用到，这很正常。",
      ],
      tryThis: ["你对什么事情的了解，远超大多数同龄人？", "你什么时候在一件重要的事情上改变过想法？", "老实说，你普通的一个周二是什么样子？"],
    },
    {
      title: "找到只有你能讲的内容",
      body: [
        "圈出三条真实而具体的素材。逐一问自己：它展现了我怎样思考、看重什么，或者我如何成长？",
        "选择那条能展现活动列表和成绩单里看不到的东西的素材。如果一个陌生人也能写出来，就继续找。",
      ],
    },
    {
      title: "选择结构",
      body: ["大多数优秀文书采用两种结构之一（见下方对比）：一个随时间展开的故事，或由一条主线串起的几个片段。选择适合你素材的结构——不要硬编一个你并没有经历过的戏剧性故事。"],
    },
    {
      title: "快速写出粗糙的初稿",
      body: ["一口气写下去，不要停下来修改。写长一点——800–1,000 词都可以，之后再删。", "使用具体细节（你看到、说过、拿在手里的东西），并为每个片段配一句反思：你当时明白了什么，或现在明白了什么。"],
    },
    {
      title: "分轮修改",
      body: [
        "第 1 轮——意义：你能用一句话说出文章的核心吗？每一段都在为它服务吗？",
        "第 2 轮——结构：移动、合并或删除段落。让开头尽快把读者带进一个场景或想法。",
        "第 3 轮——句子：删掉空话，把模糊的词换成具体的词，朗读出来，并控制在 650 词以内。",
        "条件允许的话，每轮之间隔一天。每轮修改前保存一个版本，方便对比。",
      ],
    },
    {
      title: "获取反馈，但保留你的声音",
      body: ["请一两位了解你的人阅读，问他们：“你从中了解到我什么？哪里让你失去兴趣？”——而不是“写得好吗？”", "记下他们的疑问和困惑，然后由你自己修改每一处。如果改着改着不像你了，就改回来。"],
    },
  ],
  structuresTitle: "两种常见结构",
  structures: [
    {
      name: "一个故事，随时间展开（叙事型）",
      when: "你有一个真实的转折点——一次挑战、决定或改变，可以一步步展示出来。",
      shape: ["你的起点（简短）", "事情发生转变的时刻", "你做了什么、怎么想的", "现在的你，以及你带走了什么"],
    },
    {
      name: "多个片段，一条主线（主题型）",
      when: "没有一个戏剧性的事件，但有一种特质、兴趣或价值观贯穿你生活的不同方面。",
      shape: ["点明或暗示这条主线", "3–5 个简短而多样的片段，每个展现它的不同侧面", "这条主线说明了你怎样思考或看重什么", "它指向哪里"],
    },
  ],
  pitfallsTitle: "常见误区",
  pitfalls: [
    { bad: "把活动列表改写成段落。", better: "深入写一两件事，并说明它们为什么对你重要。" },
    { bad: "详细描述一段艰难经历，却很少反思。", better: "描述要简短；把大部分篇幅用在你如何回应、现在如何理解。" },
    { bad: "用大词和名人名言来显得厉害。", better: "像向一位善于思考的朋友解释那样去写。" },
    { bad: "文章主要在写别人（祖父母、教练）。", better: "可以写他们，但重点放在你做了什么、想了什么、学到了什么。" },
    { bad: "结尾写“……这就是我想学 X 的原因”。", better: "以属于你自己的画面或想法结尾；“为什么选我们学校”留给补充文书。" },
  ],
  intlTitle: "给国际学生的提示",
  intl: [
    "当读者可能不了解某个体系时（如高考、寄宿学校作息），用一句话交代背景，然后继续往下写。",
    "语气谦虚没问题——但要清楚说明你做了什么。“我们”会掩盖你的角色；是你做的就用“我”。",
    "用最能帮助你思考的语言打草稿，然后自己用英文重写；翻译工具会抹平你的声音。",
  ],
  checklistTitle: "提交前自查",
  checklist: [
    "我能用一句话说出文章的核心。",
    "它展现了申请材料其他部分没有的内容。",
    "每一段至少有一个具体细节。",
    "有反思，而不只是事件。",
    "朗读时，听起来像我自己。",
    "不超过 650 词，并且已经校对。",
    "每一句话都是我自己写的。",
  ],
  honestyTitle: "TrueDraft 的承诺",
  honesty: "TrueDraft 从不替你写或改写文书。它的反馈会提出问题、指出可以展开的地方并解释原因——文字始终是你的，这也是大学的要求。",
  toolsTitle: "用 TrueDraft 完成这些步骤",
  startEssay: "开始写我的主文书",
  brainstorm: "在文书工作区里头脑风暴",
  sample: "查看反馈示例",
  furtherTitle: "延伸阅读（外部网站）",
  furtherNote: "链接会打开其他网站。TrueDraft 不复制其内容，也与它们没有关联。",
};

export const PERSONAL_STATEMENT_GUIDE = { en, "zh-CN": zh } as const;
