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
