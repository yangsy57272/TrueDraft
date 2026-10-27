/** A schema-valid full feedback payload used by several tests. */
export const validFeedback = {
  summary: "Clear topic.",
  strengths: [{ point: "Specific detail.", evidence_quote: "People walk in loops near the tea stall." }],
  primary_priority: { title: "Deepen reflection", explanation: "Say why it matters.", zh_note: null },
  prompt_alignment: { status: "partly", explanation: "Mostly." },
  categories: [{ key: "specificity", label: "strong_foundation", explanation: "Good.", next_step: "Keep it.", passage_quote: null, zh_note: null }],
  passage_comments: [
    { quote: "People walk in loops", observation: "Nice.", why_it_matters: "Shows noticing.", revision_question: "Why loops?", priority: "high", zh_note: null },
    { quote: "a sentence the student never wrote", observation: "x", why_it_matters: "y", revision_question: "z?", priority: "low", zh_note: null },
  ],
  revision_plan: [{ task: "Add reflection.", why: "Core of prompt.", zh_note: null }],
  voice_check: [{ question: "Does this sound like you?", note: "" }],
  questions_for_student: [],
  limitations: "AI can misread tone.",
};
