/**
 * FICTIONAL demonstration content. The essay below was written for this product's sample page.
 * It is not a real applicant's essay, and the feedback is hand-written, not a live AI response.
 */

export const SAMPLE_PROMPT =
  "Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you? What or who do you turn to when you want to learn more?";

export const SAMPLE_ESSAY = `Every Saturday I help at my aunt's noodle stall in the night market. For a long time I thought it was just work. I was wrong.

Last spring, customers kept getting lost on their way to us. The market has over two hundred stalls and the paper map at the entrance is from 2015. I decided to make a better map. At first I just drew boxes, but then I started noticing patterns. People walked in loops. Nobody went down the third row because the light there was broken. The tea stall was busy at 7pm but empty at 9pm.

I started counting people with a clicker my cousin lent me. I made a spreadsheet. I learned what a heat map is. I lost track of time so often that my aunt started calling me "the surveyor."

This experience taught me that I am passionate about urban planning. It showed me the importance of hard work and perseverance. I want to study how cities can be designed for people.

When I want to learn more, I read blogs about city design and watch videos. Now I see patterns everywhere, even in my school cafeteria.`;

export const SAMPLE_FEEDBACK = {
  material: "sufficient" as const,
  insufficient_reason: null,
  summary:
    "This draft has a genuinely original subject — mapping foot traffic at your aunt's night-market stall — and the middle paragraphs show real curiosity in action. The biggest opportunity is the fourth paragraph, where specific observations give way to general statements about passion and perseverance.",
  strengths: [
    { point: "Your observations are concrete and could only come from you.", evidence_quote: "Nobody went down the third row because the light there was broken.", located: true },
    { point: "You show learning through action rather than claiming it.", evidence_quote: "I started counting people with a clicker my cousin lent me.", located: true },
    { point: "The nickname adds warmth and a second perspective in very few words.", evidence_quote: "my aunt started calling me \"the surveyor.\"", located: true },
  ],
  primary_priority: {
    title: "Replace the summary paragraph with your own thinking",
    explanation:
      "“Passionate about urban planning” and “hard work and perseverance” could appear in thousands of essays. The prompt asks why this captivates you. What did you realise when you saw people walking in loops? Answering that in your own words will do more than any label.",
    zh_note: "第四段从具体观察跳到了空泛的总结。与其说“我热爱城市规划”，不如写出你看到人们绕圈走时想到了什么。",
  },
  prompt_alignment: {
    status: "partly",
    explanation:
      "You clearly show a topic that makes you lose track of time. The “why does it captivate you” part is only stated, not explored, and the “who/what do you turn to” answer is brief and general.",
  },
  categories: [
    { key: "prompt_response", label: "developing", explanation: "Topic is clear; the “why” needs depth.", next_step: "Add two or three sentences on what specifically fascinates you about how people move.", passage_quote: null, located: false, zh_note: null },
    { key: "specificity", label: "strong_foundation", explanation: "The broken light, the 7pm tea rush, and the clicker are vivid.", next_step: "Keep these details; consider one more number from your spreadsheet.", passage_quote: "The tea stall was busy at 7pm but empty at 9pm.", located: true, zh_note: null },
    { key: "reflection", label: "needs_attention", explanation: "Reflection is mostly a list of abstract lessons.", next_step: "Describe one moment when your understanding changed.", passage_quote: "It showed me the importance of hard work and perseverance.", located: true, zh_note: "反思部分需要写出你自己的想法变化，而不是概括性的道理。" },
    { key: "structure_pacing", label: "developing", explanation: "The story builds well, then the ending speeds up.", next_step: "Give the final two paragraphs as much room as the observations.", passage_quote: null, located: false, zh_note: null },
    { key: "clarity", label: "strong_foundation", explanation: "Sentences are clear and easy to follow.", next_step: "No major changes needed here.", passage_quote: null, located: false, zh_note: null },
    { key: "voice", label: "strong_foundation", explanation: "Plain, observant, a little funny — it sounds like a real person.", next_step: "Protect this tone when you revise the ending.", passage_quote: null, located: false, zh_note: null },
    { key: "opening_ending", label: "developing", explanation: "“I was wrong” is a good hook; the ending repeats the general claim.", next_step: "End on a specific pattern you now notice, not a summary.", passage_quote: "For a long time I thought it was just work. I was wrong.", located: true, zh_note: null },
    { key: "concision", label: "developing", explanation: "Paragraph four could be cut almost entirely and replaced with reflection.", next_step: "Use the freed words for the “why”.", passage_quote: null, located: false, zh_note: null },
  ],
  passage_comments: [
    {
      quote: "This experience taught me that I am passionate about urban planning.",
      observation: "This sentence names a conclusion instead of showing how you reached it.",
      why_it_matters: "A reader already believes you are curious from your actions; a label adds little and sounds generic.",
      revision_question: "What did you think or feel the first time your spreadsheet showed a pattern you hadn't expected?",
      priority: "high",
      located: true,
      zh_note: "试着写出数据第一次让你意外的那个瞬间。",
    },
    {
      quote: "I read blogs about city design and watch videos.",
      observation: "The answer to the second half of the prompt is vague.",
      why_it_matters: "The prompt specifically asks what or who you turn to. Naming one real source, question, or person shows how you learn.",
      revision_question: "Which blog, video, or person changed how you saw the market? What did they help you understand?",
      priority: "medium",
      located: true,
      zh_note: null,
    },
    {
      quote: "At first I just drew boxes, but then I started noticing patterns.",
      observation: "This is a strong turning point that could carry more weight.",
      why_it_matters: "It's the moment work became curiosity — the heart of your answer.",
      revision_question: "Could you slow this moment down with one more concrete detail?",
      priority: "low",
      located: true,
      zh_note: null,
    },
  ],
  revision_plan: [
    { task: "Rewrite paragraph four to explain why the patterns fascinated you, using a real moment from the market.", why: "This is the core of the prompt.", zh_note: null },
    { task: "Name one specific source or person you learn from, and what you learned.", why: "Answers the second question in the prompt.", zh_note: null },
    { task: "Replace the final sentence with a specific pattern you now notice elsewhere.", why: "Ends on your thinking instead of a summary.", zh_note: null },
    { task: "Read the draft aloud and keep every phrase that sounds like you talking.", why: "Your current voice is a strength.", zh_note: null },
  ],
  voice_check: [
    { question: "Does this sound like how you would explain the market to someone you trust?", note: "Your middle paragraphs do. Check that new sentences match them." },
    { question: "Are any sentences using vocabulary you would not naturally choose?", note: "“Passionate” and “perseverance” feel borrowed compared with the rest of the essay." },
  ],
  questions_for_student: ["What did your aunt think of your map, and did anything change at the stall because of it?"],
  limitations: "This feedback can't judge how this essay fits with the rest of your application, and AI can misread tone. Use your judgment.",
  computed: { wordCount: 214, wordLimit: 650 },
};

/** The same hand-written feedback, English only (no Chinese notes). */
export const SAMPLE_FEEDBACK_EN = (() => {
  const strip = <T extends { zh_note?: string | null }>(x: T) => ({ ...x, zh_note: null });
  return {
    ...SAMPLE_FEEDBACK,
    primary_priority: strip(SAMPLE_FEEDBACK.primary_priority),
    categories: SAMPLE_FEEDBACK.categories.map(strip),
    passage_comments: SAMPLE_FEEDBACK.passage_comments.map(strip),
    revision_plan: SAMPLE_FEEDBACK.revision_plan.map(strip),
  };
})();

/**
 * The same feedback written in Simplified Chinese, as a student who chose Chinese feedback would
 * see it. Quotes stay in English because they must match the essay exactly. Hand-written; have a
 * native-speaker editor review any change before publishing.
 */
export const SAMPLE_FEEDBACK_ZH = {
  ...SAMPLE_FEEDBACK,
  summary:
    "这篇草稿的题材很有原创性——在姑姑的夜市小摊上记录人流——中间几段也真实地展现了你的好奇心。最大的修改空间在第四段：前面具体的观察，到这里变成了关于“热爱”和“坚持”的笼统表述。",
  strengths: [
    { point: "你的观察非常具体，只有亲身经历的人才写得出来。", evidence_quote: "Nobody went down the third row because the light there was broken.", located: true },
    { point: "你通过行动展示学习过程，而不是直接宣称自己学到了什么。", evidence_quote: "I started counting people with a clicker my cousin lent me.", located: true },
    { point: "姑姑起的外号用很少的字增添了温度，也提供了另一个人的视角。", evidence_quote: "my aunt started calling me \"the surveyor.\"", located: true },
  ],
  primary_priority: {
    title: "把总结段换成你自己的思考",
    explanation:
      "“热爱城市规划”“努力和坚持”这样的话可能出现在成千上万篇文书里。题目问的是：它为什么吸引你？当你看到人们绕圈走时，你意识到了什么？用你自己的话回答这个问题，比任何标签都更有说服力。",
    zh_note: null,
  },
  prompt_alignment: {
    status: "partly" as const,
    explanation: "你清楚地写出了一个让你忘记时间的主题。但“它为什么吸引你”只是被说出来了，没有展开；“你会向什么或谁求助”的回答也比较简短、笼统。",
  },
  categories: [
    { key: "prompt_response", label: "developing", explanation: "主题清楚，但“为什么”还需要深入。", next_step: "加两三句话，写清楚人们移动的方式到底哪一点让你着迷。", passage_quote: null, located: false, zh_note: null },
    { key: "specificity", label: "strong_foundation", explanation: "坏掉的灯、晚上七点的茶摊高峰和计数器都很生动。", next_step: "保留这些细节；可以再加一个你表格里的数字。", passage_quote: "The tea stall was busy at 7pm but empty at 9pm.", located: true, zh_note: null },
    { key: "reflection", label: "needs_attention", explanation: "反思部分主要是一串抽象的道理。", next_step: "写出你的理解发生变化的某一个具体时刻。", passage_quote: "It showed me the importance of hard work and perseverance.", located: true, zh_note: null },
    { key: "structure_pacing", label: "developing", explanation: "故事铺垫得很好，但结尾节奏突然加快。", next_step: "给最后两段和观察部分同样多的篇幅。", passage_quote: null, located: false, zh_note: null },
    { key: "clarity", label: "strong_foundation", explanation: "句子清楚，容易读懂。", next_step: "这方面不需要大改。", passage_quote: null, located: false, zh_note: null },
    { key: "voice", label: "strong_foundation", explanation: "朴实、善于观察，还带点幽默——读起来像一个真实的人。", next_step: "修改结尾时保护好这种语气。", passage_quote: null, located: false, zh_note: null },
    { key: "opening_ending", label: "developing", explanation: "“I was wrong”是个好开头；结尾却重复了笼统的结论。", next_step: "用一个你现在会注意到的具体规律来结尾，而不是总结。", passage_quote: "For a long time I thought it was just work. I was wrong.", located: true, zh_note: null },
    { key: "concision", label: "developing", explanation: "第四段几乎可以整段删掉，换成反思。", next_step: "把省下的字数用来写“为什么”。", passage_quote: null, located: false, zh_note: null },
  ],
  passage_comments: [
    {
      quote: "This experience taught me that I am passionate about urban planning.",
      observation: "这句话直接给出了结论，却没有展示你是怎样得出它的。",
      why_it_matters: "读者从你的行动里已经相信你有好奇心；再贴一个标签作用不大，还显得空泛。",
      revision_question: "当你的表格第一次显示出意料之外的规律时，你在想什么、有什么感受？",
      priority: "high",
      located: true,
      zh_note: null,
    },
    {
      quote: "I read blogs about city design and watch videos.",
      observation: "对题目后半部分的回答比较模糊。",
      why_it_matters: "题目专门问你会向什么或谁求助。说出一个真实的来源、问题或人，能体现你是怎样学习的。",
      revision_question: "哪个博客、视频或人改变了你看待夜市的方式？他们帮你理解了什么？",
      priority: "medium",
      located: true,
      zh_note: null,
    },
    {
      quote: "At first I just drew boxes, but then I started noticing patterns.",
      observation: "这是一个很有力的转折点，可以承载更多内容。",
      why_it_matters: "这是“干活”变成“好奇”的时刻——也是你回答的核心。",
      revision_question: "能不能多加一个具体细节，把这个时刻放慢一点？",
      priority: "low",
      located: true,
      zh_note: null,
    },
  ],
  revision_plan: [
    { task: "重写第四段，用夜市里一个真实的时刻解释这些规律为什么吸引你。", why: "这是题目的核心。", zh_note: null },
    { task: "说出一个你会向其学习的具体来源或人，以及你学到了什么。", why: "回答题目中的第二个问题。", zh_note: null },
    { task: "把最后一句换成你现在在其他地方注意到的某个具体规律。", why: "用你的思考而不是总结来结尾。", zh_note: null },
    { task: "把草稿大声读一遍，保留每一处听起来像你在说话的表达。", why: "你现在的语气是一个优势。", zh_note: null },
  ],
  voice_check: [
    { question: "这读起来像你向一个信任的人讲述夜市时的样子吗？", note: "中间几段是的。检查新写的句子是否和它们一致。" },
    { question: "有没有哪些句子用了你平时不会自然选择的词？", note: "和文章其他部分相比，“passionate”和“perseverance”显得像是借来的。" },
  ],
  questions_for_student: ["姑姑怎么看你画的地图？小摊有没有因此发生什么变化？"],
  limitations: "这份反馈无法判断这篇文书与你申请材料其他部分的配合程度，AI 也可能误读语气。请结合你自己的判断。",
};
