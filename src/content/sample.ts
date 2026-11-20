import { countWords } from "../lib/wordcount";

/**
 * ILLUSTRATIVE demonstration content. The student and everyday situation were created for this sample page.
 * It is not a real applicant's essay, and the feedback is prewritten for demonstration, not a live AI response.
 */

export const SAMPLE_PROMPT =
  "Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you? What or who do you turn to when you want to learn more?";

export const SAMPLE_ESSAY = `A classmate once asked me what 随便 meant. I said “whatever.” A few days later, she showed me a message she was about to send. Someone had asked where she wanted to eat, and she wanted to say she was happy with anything. She asked whether “whatever” sounded annoyed. I wasn't sure how to explain why it might.

I had answered her first question quickly because it seemed easy. Then I tried the reply “whatever” in my head a few different ways. Some sounded relaxed. Others sounded as if I wanted the conversation to end. I knew the difference when I heard it, but I couldn't give her a rule that covered all of them.

Since then, I have started saving small expressions in my phone: “that's fine,” “if you want,” “never mind.” Sometimes I put two versions of a message next to each other and ask a friend which one sounds more natural. We don't always agree. Once we spent part of lunch discussing whether a full stop made a short reply seem unfriendly. By the time we stopped, I had barely touched the homework I had brought downstairs.

I usually check a learner's dictionary first, then ask classmates who use the expression. I also pause videos to compare a line with its subtitles. A dictionary helps with the meaning, but I still have to work out what the person is doing with the words. I sometimes get distracted collecting examples instead of figuring out what I think about them.

What keeps me interested is that the same few words can do different things between different people. I like trying to work out which detail changes the meaning. It can be frustrating when I think I have understood something and the next example doesn't fit.

Now, when someone asks me for a translation, I usually ask what they want to say first. That takes longer than supplying one English word. I still catch myself giving the quick answer sometimes.`;

export const SAMPLE_FEEDBACK = {
  material: "sufficient" as const,
  insufficient_reason: null,
  summary:
    "This draft makes a small misunderstanding interesting by showing how it stayed with you. The lunch discussion and unfinished homework give the interest a believable place in your day. The strongest idea is the gap between knowing a translation and understanding how it will sound to another person. The main gap is what you actually learned from examining an example: paragraphs three and four describe collecting opinions, but do not yet let us follow one comparison. Develop that exchange before adding another anecdote or polishing the ending.",
  strengths: [
    {
      point:
        "The opening gives you a small, credible reason to become curious. You admit that your first answer was incomplete without making the mistake into a dramatic turning point. Keep that proportion.",
      evidence_quote: "I wasn't sure how to explain why it might.",
      located: true,
    },
    {
      point:
        "Lunch and the neglected homework show the interest taking up time naturally. Keep this detail: it shows the interest competing with something else you meant to do.",
      evidence_quote:
        "By the time we stopped, I had barely touched the homework I had brought downstairs.",
      located: true,
    },
    {
      point:
        "This admission gives the learning process a useful complication: collecting examples is not the same as understanding them. Keep it if it accurately describes the habit; you can explore it without turning it into a resolved weakness.",
      evidence_quote:
        "I sometimes get distracted collecting examples instead of figuring out what I think about them.",
      located: true,
    },
  ],
  primary_priority: {
    title: "Let us follow one comparison, not just the habit",
    explanation:
      "Use the lunch conversation or the opening translation question to show your thinking at work. What did you initially think a reply meant? What detail made you or your friend read it differently? What did you conclude, or leave unresolved? A short exchange can connect the scene, your learning process and the reason you keep returning to the topic. Let that exchange carry the reflection. If you cannot remember the exact words, summarize the discussion accurately rather than creating a quotation.",
    zh_note:
      "先展开一次具体比较：你原先怎样理解，对方怎样理解，哪个细节影响了判断，还有什么没想通。不记得原话就准确转述，不必编对话，也不必把日常兴趣写成研究成果。",
  },
  prompt_alignment: {
    status: "partly",
    explanation:
      "The topic is clear: how short expressions carry different meanings in different situations. The lunch detail shows you losing track of another task, and the final paragraph suggests a change in how you help someone. The learning sources are named as broad types, but the draft needs one example of what a dictionary entry, classmate or subtitle helped you reconsider. Strengthening that connection will also make the explanation of why the topic captivates you less general.",
  },
  categories: [
    {
      key: "prompt_response",
      label: "developing",
      explanation:
        "You show the interest, some lost time and ways of learning. The remaining gap is a concrete connection between a source or conversation and a change in your understanding.",
      next_step:
        "After one learning example, explain what you thought before it and what you thought afterward, including any uncertainty. Check that this also clarifies why you wanted to continue.",
      passage_quote:
        "I usually check a learner's dictionary first, then ask classmates who use the expression.",
      located: true,
      zh_note: "把“我去哪里学”与“我怎样理解了一个问题”接起来。",
    },
    {
      key: "specificity",
      label: "strong_foundation",
      explanation:
        "The message about lunch, phone notes and unfinished homework give the essay a recognizable setting. A useful new detail would clarify the comparison, rather than decorate the scene.",
      next_step:
        "Add the relevant context around one expression: who was speaking, what they were trying to say, and which wording prompted different readings. Keep identities and private message details out if they are unnecessary.",
      passage_quote:
        "Once we spent part of lunch discussing whether a full stop made a short reply seem unfriendly.",
      located: true,
      zh_note: "补能帮助理解的语境，不必增加场景装饰或公开私人消息。",
    },
    {
      key: "reflection",
      label: "developing",
      explanation:
        "The draft recognizes a difference between translating words and helping someone communicate. It also admits that your examples do not always fit. The next step is to show what this tension leads you to think or ask.",
      next_step:
        "Develop one failed explanation or disagreement. Say which part of your original view you kept, changed or could not resolve; you do not need to present a universal rule.",
      passage_quote:
        "It can be frustrating when I think I have understood something and the next example doesn't fit.",
      located: true,
      zh_note: "反思可以保留没解决的问题，不必强行得出普遍规律。",
    },
    {
      key: "structure_pacing",
      label: "developing",
      explanation:
        "The opening sets up one translation problem, then the middle moves through phone notes, punctuation, dictionaries and subtitles. Each is relevant, but together they spread attention across several examples before one is developed.",
      next_step:
        "Choose the opening exchange or lunch discussion as the main thread. Keep the other learning methods brief, and develop the one that genuinely helped with that thread.",
      passage_quote:
        "I also pause videos to compare a line with its subtitles.",
      located: true,
      zh_note: "选择一条主线；其他学习方式只保留与主线有关的部分。",
    },
    {
      key: "clarity",
      label: "developing",
      explanation:
        "The opening shifts from the Chinese expression to the English word “whatever.” The classmate wants an English reply, but readers may initially wonder which language the message uses. Later, “different things” leaves the central idea broad.",
      next_step:
        "Clarify that the classmate is choosing an English reply. Then use the chosen comparison to explain the relevant distinction, without treating either language as having one fixed tone.",
      passage_quote:
        "A few days later, she showed me a message she was about to send.",
      located: true,
      zh_note:
        "交代消息用什么语言，并区分具体语境，不把一种语言的语气一概而论。",
    },
    {
      key: "voice",
      label: "strong_foundation",
      explanation:
        "The uncertainty, unfinished homework and occasional quick answer make the narrator approachable. You do not need to replace this voice with technical terms to justify the interest.",
      next_step:
        "Read the new explanation aloud beside the opening. Keep phrasing you would naturally use, including uncertainty when it is accurate. Explain any specialist term you genuinely need.",
      passage_quote: "I still catch myself giving the quick answer sometimes.",
      located: true,
      zh_note: "保留犹豫与不完美，不必为了显得学术而换一种声音。",
    },
    {
      key: "opening_ending",
      label: "developing",
      explanation:
        "The ending returns to helping someone translate and keeps the change modest. It will feel more earned if the middle shows how you came to ask about intention rather than supply a single word.",
      next_step:
        "Develop the middle first. Then check whether the last paragraph reflects what you actually learned. Keep the unfinished habit if it is true; a polished moral or perfect transformation is unnecessary.",
      passage_quote:
        "Now, when someone asks me for a translation, I usually ask what they want to say first.",
      located: true,
      zh_note: "先让中段支撑变化，再判断是否需要调整结尾。",
    },
    {
      key: "concision",
      label: "developing",
      explanation:
        "The list of saved expressions establishes a habit, but the draft also lists several learning methods. These compete with space that could show one actual comparison.",
      next_step:
        "Keep one or two expressions and the methods that help explain your main example. Use the space for reasoning, not more accomplishments. The 650-word limit is a ceiling, not a target to fill.",
      passage_quote:
        "Since then, I have started saving small expressions in my phone: “that's fine,” “if you want,” “never mind.”",
      located: true,
      zh_note: "少列几个例子，把空间留给具体思考；不必凑满650词。",
    },
  ],
  passage_comments: [
    {
      quote:
        "Once we spent part of lunch discussing whether a full stop made a short reply seem unfriendly.",
      observation:
        "This is a useful scene, but we do not yet know what the two of you compared or why you read the reply differently. The next sentence shows lost time more clearly than this one shows the thinking.",
      why_it_matters:
        "The scene can answer both why the topic holds your attention and how another person helps you learn. One developed exchange would do more work than several additional examples.",
      revision_question:
        "What was the short reply, if you remember it? What did each of you think the full stop changed? Which part of the disagreement made you reconsider something, or remained unresolved? Summarize if you cannot recall the exact words.",
      priority: "high",
      located: true,
      zh_note: "把午餐时的一次分歧写清楚；不记得原话可以转述，不必补造对话。",
    },
    {
      quote:
        "I usually check a learner's dictionary first, then ask classmates who use the expression.",
      observation:
        "You tell us the types of sources you consult, but not what one source added. A dictionary and a classmate may help with different parts of the same question.",
      why_it_matters:
        "The prompt asks what or whom you turn to when you want to learn. Explaining one useful idea and your response would show how you learn.",
      revision_question:
        "Choose a source or conversation you actually remember. What question did you bring to it, what did it help explain, and what was still unclear? Name or describe the source accurately so a reader can follow the learning.",
      priority: "high",
      located: true,
      zh_note: "来源不必有名，但需要真实；说明它具体帮你理解了什么。",
    },
    {
      quote:
        "What keeps me interested is that the same few words can do different things between different people.",
      observation:
        "This states the central idea, but “different things” is broader than the specific situations in the opening and lunch scene.",
      why_it_matters:
        "A reader needs to understand what interests you about the difference. You can explain that through the example you choose, without turning an observation into a rule for every speaker.",
      revision_question:
        "In your main example, what were the two possible readings? What made it interesting that both seemed plausible to somebody? Which detail did you want to understand better? Keep the explanation tied to that situation.",
      priority: "medium",
      located: true,
      zh_note: "用主例子解释“不同”具体指什么，不必概括所有人的语言习惯。",
    },
    {
      quote: "A few days later, she showed me a message she was about to send.",
      observation:
        "The scene moves from explaining a Chinese expression to choosing an English reply. That transition is understandable in context, but it asks the reader to infer the language of the message.",
      why_it_matters:
        "A small clarification would let readers follow the question immediately and spend their attention on your thinking. It would also avoid suggesting that the original expression and “whatever” always have matching uses.",
      revision_question:
        "Can you briefly clarify that she was drafting an English reply and what she wanted it to communicate? Keep only the context needed to understand the exchange; the real recipient or private message does not need to appear.",
      priority: "medium",
      located: true,
      zh_note: "只补足理解对话所需的语境，不必透露真实收件人或私人消息。",
    },
    {
      quote:
        "I sometimes get distracted collecting examples instead of figuring out what I think about them.",
      observation:
        "This complication makes the learning feel less tidy. It also opens a useful question about the difference between noticing examples and making sense of one.",
      why_it_matters:
        "Keeping a limitation can make the reflection more precise. You do not have to claim you fixed the habit, but the reader would benefit from knowing how you think about it now.",
      revision_question:
        "Can you recall a time when another example complicated your explanation? What made you stop, compare or ask a better question, if anything? If the habit is still unresolved, say so without adding a neat solution.",
      priority: "medium",
      located: true,
      zh_note: "可以写仍然存在的困难，不需要替自己编出一个已经解决的弱点。",
    },
    {
      quote: "I still catch myself giving the quick answer sometimes.",
      observation:
        "The final sentence resists a perfect before-and-after story. It can work because it returns to the quick answer in the opening.",
      why_it_matters:
        "An ending does not need to announce a career goal or erase uncertainty. Its job here is to leave us with an accurate sense of how you now approach a familiar situation.",
      revision_question:
        "After expanding the middle, does this still feel like the most honest place to stop? Keep it if so. If another ending fits better, use a real question or observation rather than adding a new achievement.",
      priority: "low",
      located: true,
      zh_note: "结尾可以不圆满；关键是它与文中的思考相符。",
    },
  ],
  revision_plan: [
    {
      task: "Choose the opening exchange or lunch discussion as the main example. Note what each person meant, the wording discussed and what you remember accurately. Done when you can separate remembered detail from a guess.",
      why: "A reliable example gives you material for the revision. You do not need to reconstruct private messages or make up dialogue.",
      zh_note: "先选一段记得清楚的经历，区分真实记忆与猜测。",
    },
    {
      task: "Expand that example with your initial reading, the other reading and what you reconsidered. Done when a reader can follow the comparison and understand why you wanted to keep thinking about it.",
      why: "This connects the scene to the intellectual curiosity the prompt asks about. The outcome may remain uncertain.",
      zh_note: "让读者跟得上比较过程，不要求最后得出唯一答案。",
    },
    {
      task: "Connect one actual learning source or conversation to that example. Done when the reader can identify the question you asked, what you learned and what remained unclear. Keep other source types brief.",
      why: "This answers how you learn, rather than simply listing where you look. A classmate can be a useful source when you explain what their perspective added.",
      zh_note: "把一个真实来源与具体问题接起来，不必罗列很多来源。",
    },
    {
      task: "Clarify the English-message context, then trim examples that repeat the same point. Done when each remaining detail either helps us follow the exchange or adds something to your thinking.",
      why: "The clarification removes an avoidable ambiguity; the cuts make room for the comparison without lengthening every paragraph.",
      zh_note: "交代必要语境，删去重复作用的例子。",
    },
    {
      task: "Read the revised middle beside the opening and ending. Done when they describe a believable, still-developing habit, every prompt part is addressed, and all details are supportable. Check the 650-word ceiling last.",
      why: "This protects the natural voice and modest scale of the experience. No dramatic transformation or major declaration is necessary.",
      zh_note: "保留自然语气与不完美，最后再核对题目、事实和字数。",
    },
  ],
  voice_check: [
    {
      question:
        "Would you explain the lunch conversation this way to a friend?",
      note: "Keep your ordinary phrasing when expanding it. Use the added detail to help us follow who understood what, and why.",
    },
    {
      question:
        "Are the message, source and remembered words accurate enough to use?",
      note: "Paraphrase when exact wording is uncertain. Keep unnecessary private details out, and do not invent a dictionary entry, video title or conversation.",
    },
    {
      question: "Does the revision still allow you to be unsure?",
      note: "The disagreement and occasional quick answer are part of this draft’s voice. Check that your explanation leaves room for both.",
    },
  ],
  questions_for_student: [
    "Which of the two conversations do you remember most clearly?",
    "What did the other person notice that you had missed?",
    "Which actual source or conversation helped you think through that difference?",
    "What do you still find difficult about helping someone choose words?",
  ],
  limitations:
    "This is an illustrative, prewritten sample, not a real student’s submission, testimonial or live AI response. Feedback cannot verify memories or sources. Questions suggest directions to explore; they are not facts to add. No view is offered on admission chances or how this essay fits a complete application. The writer should keep control of the experiences, interpretation and wording.",
  computed: { wordCount: countWords(SAMPLE_ESSAY), wordLimit: 650 },
};

/** Same diagnosis without Chinese notes. */
export const SAMPLE_FEEDBACK_EN = (() => {
  const strip = <T extends { zh_note?: string | null }>(
    x: T,
  ): Omit<T, "zh_note"> & { zh_note: null } => {
    const { zh_note: _zh_note, ...rest } = x;
    return { ...rest, zh_note: null };
  };
  return {
    ...SAMPLE_FEEDBACK,
    primary_priority: strip(SAMPLE_FEEDBACK.primary_priority),
    categories: SAMPLE_FEEDBACK.categories.map(strip),
    passage_comments: SAMPLE_FEEDBACK.passage_comments.map(strip),
    revision_plan: SAMPLE_FEEDBACK.revision_plan.map(strip),
  };
})();
/** Same evidence and priorities in Simplified Chinese; quotations remain in their original language.
 * Prepared example, not independently reviewed or generated by a live model.
 */
export const SAMPLE_FEEDBACK_ZH = {
  material: "sufficient" as const,
  insufficient_reason: null,
  summary:
    "这篇草稿让一个小误会变得有意思，因为你写出了它怎样留在心里。午餐时的讨论和没顾上写的作业，让兴趣有了可信的生活位置。最值得展开的，是“知道一个译法”与“理解别人听起来是什么感受”之间的距离。目前第三、四段更多在写收集例子和意见，还没有让读者跟着完成一次比较。先把一次交流写清，再考虑增加故事或润色结尾。",
  strengths: [
    {
      point:
        "开头给好奇心提供了一个小而可信的起点。你承认第一次回答不够完整，却没有把失误包装成戏剧性的转折。可以保留这种分寸。",
      evidence_quote: "I wasn't sure how to explain why it might.",
      located: true,
    },
    {
      point:
        "午餐与没顾上写的作业，自然地说明兴趣怎样占据了时间，可以保留这个细节，它说明兴趣怎样与原本要做的事争夺注意力。",
      evidence_quote:
        "By the time we stopped, I had barely touched the homework I had brought downstairs.",
      located: true,
    },
    {
      point:
        "这处承认让学习过程有了真实的复杂性：收集例子不等于理解例子。如果符合实际，可以展开这个习惯，而不必声称已经克服它。",
      evidence_quote:
        "I sometimes get distracted collecting examples instead of figuring out what I think about them.",
      located: true,
    },
  ],
  primary_priority: {
    title: "让读者跟着完成一次比较，而不只是知道你有这个习惯",
    explanation:
      "可以选午餐讨论或开头的翻译问题，具体展示思考。你最初怎样理解一句回复？哪个细节让你或朋友读出了不同意思？你得出了什么看法，还有什么没想通？一段简短交流就能连接场景、学习过程与持续兴趣。让这段交流承担反思。不记得原话时，准确转述经过，而不是编造引语。",
    zh_note: null,
  },
  prompt_alignment: {
    status: "partly",
    explanation:
      "主题已经清楚：短语在不同情境中怎样传递不同意思。午餐细节说明你顾不上另一项任务，结尾也暗示帮助别人时的做法有所变化。但学习来源仍主要是大类，需要补充一次词典、同学或字幕怎样帮助你重新理解问题的例子。补足这个联系，也会让“为什么吸引你”不再停留于笼统表述。",
  },
  categories: [
    {
      key: "prompt_response",
      label: "developing",
      explanation:
        "文章写出了兴趣、投入的时间和学习方式。尚缺的是某个来源或对话怎样具体改变理解。",
      next_step:
        "在一个学习例子后，说明此前怎样想、之后怎样想，也保留不确定性。检查这是否同时解释了继续思考的原因。",
      passage_quote:
        "I usually check a learner's dictionary first, then ask classmates who use the expression.",
      located: true,
      zh_note: null,
    },
    {
      key: "specificity",
      label: "strong_foundation",
      explanation:
        "午餐消息、手机笔记和未完成的作业，让场景容易理解。更有价值的新细节应帮助比较，而不是装饰场景。",
      next_step:
        "补充一个表达的必要语境：谁在说、想表达什么、哪处措辞引起不同理解。不必要的身份和私人消息细节可以不写。",
      passage_quote:
        "Once we spent part of lunch discussing whether a full stop made a short reply seem unfriendly.",
      located: true,
      zh_note: null,
    },
    {
      key: "reflection",
      label: "developing",
      explanation:
        "你注意到翻译词语与帮助别人沟通不是一回事，也承认例子未必符合已有解释。下一步是展示这种矛盾让你怎样想、怎样问。",
      next_step:
        "展开一次解释不通或意见不一致的情况。说明原先看法中保留、调整或仍未解决的部分，不必提出普遍规律。",
      passage_quote:
        "It can be frustrating when I think I have understood something and the next example doesn't fit.",
      located: true,
      zh_note: null,
    },
    {
      key: "structure_pacing",
      label: "developing",
      explanation:
        "开头提出一个翻译问题，中段接着写手机笔记、标点、词典和字幕。都有关联，但还没深入一个例子，注意力就转到了下一个。",
      next_step:
        "选择开头交流或午餐讨论作为主线。简写其他学习方式，展开真正帮助你思考这条主线的一种。",
      passage_quote:
        "I also pause videos to compare a line with its subtitles.",
      located: true,
      zh_note: null,
    },
    {
      key: "clarity",
      label: "developing",
      explanation:
        "开头从随便转到英文 whatever。按语境可以理解，但读者可能先疑惑消息用哪种语言；后面的 different things 也比较笼统。",
      next_step:
        "交代同学是在选择英文回复，再用主例子说明相关区别。不要把任何一种语言写成只有固定语气。",
      passage_quote:
        "A few days later, she showed me a message she was about to send.",
      located: true,
      zh_note: null,
    },
    {
      key: "voice",
      label: "strong_foundation",
      explanation:
        "不确定、没写完的作业和偶尔仍会给出快捷答案，让叙述者亲近可信。不必靠专业术语证明这个兴趣值得写。",
      next_step:
        "把新解释接在开头后朗读。保留自然表达与真实的不确定性，只有确实需要时才使用并解释专业词。",
      passage_quote: "I still catch myself giving the quick answer sometimes.",
      located: true,
      zh_note: null,
    },
    {
      key: "opening_ending",
      label: "developing",
      explanation:
        "结尾回到帮助别人翻译，变化也保持了适当尺度。如果中段写清为什么开始先问意图，这个结尾会更有支撑。",
      next_step:
        "先展开中段，再检查最后一段是否符合实际理解。如果习惯仍不完美，可以保留，不必补上漂亮道理或彻底转变。",
      passage_quote:
        "Now, when someone asks me for a translation, I usually ask what they want to say first.",
      located: true,
      zh_note: null,
    },
    {
      key: "concision",
      label: "developing",
      explanation:
        "保存短语的清单建立了一个习惯，但学习方式也列了几项，占用了展示一次比较的空间。",
      next_step:
        "保留一两个表达和有助于主例子的学习方式。把空间用来解释思考，不必增加成果，也不必凑满650词。",
      passage_quote:
        "Since then, I have started saving small expressions in my phone: “that's fine,” “if you want,” “never mind.”",
      located: true,
      zh_note: null,
    },
  ],
  passage_comments: [
    {
      quote:
        "Once we spent part of lunch discussing whether a full stop made a short reply seem unfriendly.",
      observation:
        "这是一个有用的场景，但还不知道你们比较了什么、为什么读出了不同意思。下一句比这一句更清楚地展示了忘记另一件事，却还没展示思考过程。",
      why_it_matters:
        "这段交流可以同时回答为什么投入、怎样向别人学习。展开一次交流，比再增加几种例子更有用。",
      revision_question:
        "如果记得，讨论的是哪句简短回复？你们各自觉得句号改变了什么？哪部分分歧使你重新考虑，或仍没有解决？不记得原话可以转述。",
      priority: "high",
      located: true,
      zh_note: null,
    },
    {
      quote:
        "I usually check a learner's dictionary first, then ask classmates who use the expression.",
      observation:
        "你交代了咨询哪些类型的来源，却没有说明其中一个具体增加了什么。词典与同学可能帮助解释同一问题的不同部分。",
      why_it_matters:
        "题目问你想进一步了解时向什么或谁求助。解释一个有用的想法和自己的回应，能让读者看清怎样学习。",
      revision_question:
        "选一个真正记得的来源或对话：带着什么问题去了解，它解释了什么，还有什么不清楚？准确指出或描述来源，方便读者跟上学习过程。",
      priority: "high",
      located: true,
      zh_note: null,
    },
    {
      quote:
        "What keeps me interested is that the same few words can do different things between different people.",
      observation:
        "这句话提出了中心想法，但 different things 比开头和午餐场景中的具体情况宽泛。",
      why_it_matters:
        "读者需要明白这种区别的哪一点吸引你。可以通过主例子解释，不必把一次观察写成适用于所有人的规律。",
      revision_question:
        "主例子中有哪两种可能理解？它们为什么分别对某个人显得合理？哪个细节让你想继续弄懂？把解释留在这个情境里。",
      priority: "medium",
      located: true,
      zh_note: null,
    },
    {
      quote: "A few days later, she showed me a message she was about to send.",
      observation:
        "场景从解释一个中文表达转向选择英文回复。语境大体能帮助理解，但仍让读者自行推断消息所用语言。",
      why_it_matters:
        "一个小交代能让读者立即跟上，把注意力留给思考，也能避免暗示随便与 whatever 的使用方式总是一致。",
      revision_question:
        "能否简短说明同学正在起草英文回复、希望传达什么？只保留理解交流所需的语境，不必写真实收件人或私人消息。",
      priority: "medium",
      located: true,
      zh_note: null,
    },
    {
      quote:
        "I sometimes get distracted collecting examples instead of figuring out what I think about them.",
      observation:
        "这处困难让学习过程不那么整齐，也提出了“注意到例子”与“理解一个例子”之间的区别。",
      why_it_matters:
        "保留局限可以让反思更准确。不必说已经改掉这个习惯，但读者会想知道你现在怎样理解它。",
      revision_question:
        "能否想起一个使已有解释更复杂的例子？如果有，什么让你停下来比较或提出更好的问题？若习惯仍没解决，可以如实保留，不必补一个圆满方案。",
      priority: "medium",
      located: true,
      zh_note: null,
    },
    {
      quote: "I still catch myself giving the quick answer sometimes.",
      observation:
        "最后一句没有把成长写成完美的前后对照，还呼应了开头的快捷回答，因此可以成立。",
      why_it_matters:
        "结尾不必宣布职业志向或抹去不确定性。这里更重要的是，让读者准确理解你现在怎样面对熟悉的情况。",
      revision_question:
        "中段展开后，这里是否仍是最诚实的结束位置？如果是，可以保留；若有更合适的结尾，用真实问题或观察，而不是新增成果。",
      priority: "low",
      located: true,
      zh_note: null,
    },
  ],
  revision_plan: [
    {
      task: "选择开头交流或午餐讨论，记录双方想表达什么、讨论的措辞以及确实记得的内容。完成标准：能分清真实记忆与猜测。",
      why: "可靠的例子才适合展开，不必重构私人消息或编造对话。",
      zh_note: null,
    },
    {
      task: "展开这个例子，写清最初理解、另一种理解和重新考虑的部分。完成标准：读者能跟上比较，也能理解为什么想继续思考。",
      why: "连接场景与题目所问的好奇心，结论可以仍不确定。",
      zh_note: null,
    },
    {
      task: "把一个真实来源或对话接到例子中。完成标准：读者能看出你提出什么问题、学到什么、还有什么不清楚。简写其他来源类型。",
      why: "回答怎样学习，而不只是列出去哪里找。向同学请教也可以，需要说明对方的视角具体增加了什么。",
      zh_note: null,
    },
    {
      task: "交代消息是英文回复，再删减重复作用的例子。完成标准：保留下来的细节都能帮助理解交流，或增加对思考的认识。",
      why: "用小交代消除歧义，并腾出空间展开比较，不必把每段都加长。",
      zh_note: null,
    },
    {
      task: "把修改后的中段与开头、结尾一起朗读。完成标准：习惯可信且仍在发展，题目各部分有回应，细节有依据。最后核对650词上限。",
      why: "保护自然语气与日常经历的尺度，不要求戏剧性转变或专业宣言。",
      zh_note: null,
    },
  ],
  voice_check: [
    {
      question: "向朋友解释午餐讨论时，你会这样说吗？",
      note: "展开时保留普通表达。用增加的细节帮助读者跟上：谁怎样理解，为什么。",
    },
    {
      question: "消息、来源和记得的措辞准确到可以使用吗？",
      note: "不确定原话就转述；保留必要语境，避免私人细节，不虚构词典条目、视频标题或对话。",
    },
    {
      question: "修改后是否仍允许自己不确定？",
      note: "分歧与偶尔仍会给出快捷答案，是这篇草稿声音的一部分。只声称经历真正支持的变化。",
    },
  ],
  questions_for_student: [
    "两段交流中，哪一段记得最清楚？",
    "对方注意到了什么你原先忽略的地方？",
    "哪个真实来源或对话帮助你思考过这个区别？",
    "帮助别人选择措辞时，你现在仍觉得什么比较困难？",
  ],
  limitations:
    "这是预先编写的说明性示例，不是真实学生的投稿、评价或实时 AI 响应。反馈无法核实记忆和来源；提出的问题只是思考方向，不是应添加的事实。这里不判断录取概率或整份申请的配合程度。经历、理解与措辞应由写作者自己掌握。",
};
