import "dotenv/config";
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { resource } from "../src/db/schema";

/**
 * Seeds ORIGINAL educational resources written for TrueDraft, plus attributed external links.
 * No student data, no real essays, and no third-party proprietary material.
 */

type Seed = Omit<typeof resource.$inferInsert, "id" | "createdAt" | "updatedAt">;

const ORIGINAL = {
  source: "TrueDraft original guide",
  author: "TrueDraft editorial team",
  licenseStatus: "original",
  permissionNotes: "Written for TrueDraft. Owned by the operator.",
  collection: "original",
  access: "public",
  contentType: "article",
  retrievalAllowed: false,
  published: true,
} as const;

const resources: Seed[] = [
  {
    ...ORIGINAL,
    slug: "no-dramatic-story-needed",
    language: "en",
    category: "reflection",
    title: "You don't need a dramatic story",
    summary: "Ordinary experiences, written with specificity and honest reflection, often make the strongest essays.",
    contentOrUrl: `Many students believe a college essay must describe a tragedy, a dramatic rescue, or a once-in-a-lifetime trip. It doesn't.

Readers are trying to understand **how you think** — what you notice, what you care about, and how you change. An everyday routine can show that just as clearly as a crisis.

## What makes a "small" topic work

- **A specific moment.** Not "I help at my family's shop" but "the Tuesday the receipt printer jammed during the lunch rush."
- **Your own reasoning.** What did you try first? What did you wonder about?
- **A shift.** Something you understood afterwards that you didn't before — even a small one.

## A quick test

Ask yourself: *could anyone else have written this paragraph?* If the answer is yes, add a detail that only you would know.

## You never have to share more than you want

You don't need to disclose trauma, health, family conflict, or finances to write a meaningful essay. If you choose to write about something difficult, you decide how much to say.`,
  },
  {
    ...ORIGINAL,
    slug: "bu-xu-yao-xiju-hua-de-gushi",
    language: "zh-CN",
    category: "reflection",
    title: "你不需要一个戏剧化的故事",
    summary: "普通的经历，只要写得具体、反思真诚，往往就能成为很好的文书。",
    contentOrUrl: `很多同学以为申请文书一定要写一场变故、一次惊险的经历，或者一趟难得的旅行。其实不需要。

读者想了解的是**你如何思考**——你会注意到什么、在乎什么，以及你是怎样改变的。一件日常小事，同样可以清楚地展现这些。

## “小”题目怎样写好

- **一个具体的瞬间。** 不要写“我在家里的店帮忙”，而是写“那个周二午饭高峰，小票打印机卡纸了”。
- **你自己的思考过程。** 你先试了什么办法？你好奇的是什么？
- **一点变化。** 事后你明白了一件之前没想到的事——哪怕很小也可以。

## 一个小测试

问问自己：*这一段别人也能写出来吗？* 如果答案是“能”，就加一个只有你才知道的细节。

## 你永远不必分享超出意愿的内容

写出有意义的文书，并不需要你披露创伤、健康、家庭矛盾或经济状况。如果你选择写困难的经历，说多少由你决定。`,
  },
  {
    ...ORIGINAL,
    slug: "show-the-moment",
    language: "en",
    category: "craft",
    title: "Show the moment, then say what it meant",
    summary: "A simple pattern for turning general statements into specific, reflective writing.",
    contentOrUrl: `General statements — "I learned the value of hard work" — are easy to write and easy to forget. A reader remembers moments.

## The pattern

1. **Moment:** one scene, with a time, place, or object.
2. **Action:** what *you* did or decided.
3. **Meaning:** what you understood, in your own words.

## Before and after (fictional example)

*Before:* "Volunteering taught me patience."

*After:* "By the third time Mr. Lin asked me how to attach a photo to an email, I stopped explaining and slid the phone back to him. He found the paperclip icon himself. I realised that helping sometimes means doing less."

Notice that the "after" version doesn't use the word *patience* at all.

## Don't invent

Specific doesn't mean invented. If you can't remember the exact words someone said, describe what you do remember. Honest detail is always better than a made-up quote.`,
  },
  {
    ...ORIGINAL,
    slug: "xian-xie-shunjian-zai-xie-yiyi",
    language: "zh-CN",
    category: "craft",
    title: "先写瞬间，再写意义",
    summary: "把空泛的表述变成具体、有反思的文字的一个简单方法。",
    contentOrUrl: `“我学会了努力的价值”这样的概括很好写，但也很容易被忘记。读者记住的是瞬间。

## 三步法

1. **瞬间：** 一个场景，有时间、地点或某个物件。
2. **行动：** *你*做了什么，或者做了什么决定。
3. **意义：** 你明白了什么——用你自己的话说。

## 修改前后对比（虚构示例）

*修改前：* “做志愿者让我学会了耐心。”

*修改后：* “林叔叔第三次问我怎么在邮件里加照片时，我没有再解释，而是把手机推回给他。他自己找到了那个回形针图标。我意识到，帮助有时意味着少做一点。”

注意，修改后的版本根本没有出现“耐心”这个词。

## 不要编造

具体不等于编造。如果你记不清别人说的原话，就写你记得的部分。真实的细节永远比编出来的引语更好。`,
  },
  {
    ...ORIGINAL,
    slug: "reading-a-prompt-closely",
    language: "en",
    category: "prompt",
    title: "Reading a prompt closely",
    summary: "Underline the verbs, find every question, and notice what the prompt does not ask.",
    contentOrUrl: `Before you draft, spend five minutes with the prompt itself.

## Three steps

1. **Underline the verbs.** "Describe", "reflect", "explain why" each ask for something different. *Describe* alone is rarely enough — most prompts also want your thinking.
2. **Count the questions.** Many prompts contain two or three. Make sure your draft answers each one, even briefly.
3. **Notice the limits.** If a prompt asks about "a community you belong to", it does not require a formal club. A family group chat, a neighbourhood, or an online forum can count.

## Common misunderstandings

- Thinking you must pick the most impressive achievement.
- Writing a résumé in paragraph form.
- Answering a different, easier question than the one asked.

The Prompt Decoder tool in your workspace walks through these steps for any prompt.`,
  },
  {
    ...ORIGINAL,
    slug: "jingdu-wenshu-timu",
    language: "zh-CN",
    category: "prompt",
    title: "仔细读懂文书题目",
    summary: "圈出动词，找出每一个问题，并留意题目没有要求的内容。",
    contentOrUrl: `动笔之前，先花五分钟认真读题。

## 三个步骤

1. **圈出动词。** “描述”“反思”“解释原因”要求的东西各不相同。只有“描述”通常不够——大多数题目也想看到你的思考。
2. **数一数有几个问题。** 很多题目包含两到三个问题。确保你的草稿每个都回答到了，哪怕只是简短回应。
3. **留意题目的边界。** 如果题目问的是“你所属的一个社群”，它并不要求一定是正式社团。家庭群聊、街坊邻里或网络论坛都可以算。

## 常见误解

- 以为必须挑选最“厉害”的成就。
- 把简历改写成段落。
- 回答了一个更简单的问题，而不是题目真正问的问题。

文书工作区中的“题目解读”工具，会带你一步步完成这些。`,
  },
  {
    ...ORIGINAL,
    slug: "three-essay-shapes",
    language: "en",
    category: "structure",
    title: "Three essay shapes that work",
    summary: "Chronological, thematic, and 'zoom out' structures — and when each one fits.",
    contentOrUrl: `There is no single correct structure. Here are three shapes students use successfully.

## 1. Chronological, with a turning point

Start close to the key moment, give only the background needed, and spend most of your words on what changed. *Risk:* long setup. Try starting one paragraph later than you think.

## 2. Thematic

Several short scenes connected by one idea — a recurring object, a question you keep asking, a skill you keep using in different places. *Risk:* a list without depth. Make sure the final scene shows growth, not just one more example.

## 3. Zoom out

Begin with one small, specific scene, then widen to what it reveals about how you think. *Risk:* the "zoom out" becomes generic. Keep the reflection as specific as the opening.

## Whatever the shape

Readers should be able to answer: *What happened? What did you do? What do you understand now?*`,
  },
  {
    ...ORIGINAL,
    slug: "keep-your-voice-in-a-second-language",
    language: "en",
    category: "language",
    title: "Keeping your voice when English is your second language",
    summary: "Clear, natural sentences beat borrowed vocabulary. Your multilingual perspective is an asset.",
    contentOrUrl: `If English is not your first language, you may feel pressure to sound "advanced". Resist it.

## Prefer precise over impressive

A thesaurus word you wouldn't use in conversation often sounds slightly wrong. A simple, exact word sounds like you.

## Keep meaningful words from your other languages

If there's a word in Chinese (or another language) that captures something English can't, you can use it and briefly explain it. That's part of your perspective.

## Read aloud

Reading your draft aloud is the fastest way to find sentences that don't sound like you.

## Use feedback carefully

When a tool or a person suggests a rewrite, ask: *would I say this?* If not, keep your version and fix only the grammar.`,
  },
  {
    ...ORIGINAL,
    slug: "baochi-ziji-de-shengyin",
    language: "zh-CN",
    category: "language",
    title: "用第二语言写作时，如何保持自己的声音",
    summary: "清楚自然的句子胜过借来的“高级”词汇。你的多语言视角是一种优势。",
    contentOrUrl: `如果英语不是你的母语，你可能会觉得必须写得很“高级”。请不要被这种压力带着走。

## 精准比华丽更重要

一个你平时说话不会用的“同义词词典词汇”，读起来往往有点别扭。一个简单而准确的词，才像你自己。

## 保留有意义的母语词汇

如果有一个中文（或其他语言）的词能表达英文表达不了的东西，你可以直接使用，再简单解释一下。这正是你独特视角的一部分。

## 大声朗读

把草稿读出来，是找出“不像你”的句子最快的方法。

## 谨慎对待修改建议

当工具或别人建议改写时，问问自己：*我会这样说吗？* 如果不会，就保留你自己的版本，只修改语法错误。`,
  },
  {
    ...ORIGINAL,
    slug: "cutting-words",
    language: "en",
    category: "craft",
    title: "Cutting words without cutting yourself",
    summary: "Trim setup and repetition first; protect your most personal and reflective sentences.",
    contentOrUrl: `When you're over the limit, cut in this order:

1. **Setup.** Background the reader can infer. Your first paragraph often contains a sentence you can delete.
2. **Repetition.** The same idea said twice in different words.
3. **Stacked modifiers.** "Very", "really", "truly incredibly"…
4. **Summary sentences** that restate what a scene already showed.

## What to protect

The sentences where you explain what *you* noticed, decided, or understood. These are usually the most personal — and the most valuable. Don't delete them just because they're long; tighten them instead.`,
  },
  {
    ...ORIGINAL,
    slug: "using-ai-honestly",
    language: "en",
    category: "integrity",
    title: "Using AI tools honestly",
    summary: "How to use AI for feedback while keeping your essay your own — and following your schools' rules.",
    contentOrUrl: `AI can be a useful reader. It can also quietly replace your voice if you let it.

## Good uses

- Asking what a prompt means.
- Finding unclear or repetitive passages.
- Getting questions that help you reflect.

## Risky uses

- Accepting rewritten paragraphs wholesale.
- Letting it "add detail" — it can only invent.
- Asking it to write an essay "in your style".

## Know the rules

Colleges and application platforms have their own policies on AI and outside help, and they change. Read the current policy for every school you apply to, and when unsure, ask.`,
  },
  {
    ...ORIGINAL,
    slug: "chengshi-shiyong-ai",
    language: "zh-CN",
    category: "integrity",
    title: "诚实地使用 AI 工具",
    summary: "如何借助 AI 获得反馈，同时让文书始终属于你自己，并遵守学校的规定。",
    contentOrUrl: `AI 可以是一个有用的读者，但如果不留意，它也会悄悄取代你的声音。

## 合适的用法

- 询问题目是什么意思。
- 找出不清楚或重复的段落。
- 获得能帮助你反思的问题。

## 有风险的用法

- 整段照搬 AI 改写的内容。
- 让它“补充细节”——它只能编造。
- 让它“模仿你的风格”写一篇文书。

## 了解规定

各大学和申请平台对 AI 和外部帮助都有各自的政策，而且会变化。请阅读你申请的每所学校的最新政策；不确定时，直接询问学校。`,
  },
  {
    slug: "common-app-official-site",
    language: "multi",
    category: "prompt",
    title: "Common App — official website",
    summary: "The official source for current Common App essay prompts and application requirements.",
    contentOrUrl: "https://www.commonapp.org/",
    contentType: "external_link",
    source: "Common App (external link)",
    author: "Common App",
    licenseStatus: "public_link",
    permissionNotes: "Link only; no content copied. TrueDraft is not affiliated with Common App.",
    collection: "external_links",
    access: "public",
    retrievalAllowed: false,
    published: true,
  },
  {
    slug: "purdue-owl",
    language: "en",
    category: "language",
    title: "Purdue Online Writing Lab (OWL)",
    summary: "Free reference material on grammar, punctuation, and English usage.",
    contentOrUrl: "https://owl.purdue.edu/",
    contentType: "external_link",
    source: "Purdue University (external link)",
    author: "Purdue OWL",
    licenseStatus: "public_link",
    permissionNotes: "Link only; no content copied.",
    collection: "external_links",
    access: "public",
    retrievalAllowed: false,
    published: true,
  },
];

async function main() {
  const db = getDb();
  for (const r of resources) {
    await db
      .insert(resource)
      .values(r)
      .onConflictDoUpdate({
        target: resource.slug,
        set: { ...r, updatedAt: sql`now()` },
      });
  }
  console.log(`Seeded ${resources.length} original resources and links.`);
  await closeDb();
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
