/** A schema-valid full feedback payload used by several tests. */
export const validFeedback = {
  material: "sufficient",
  insufficient_reason: null,
  summary: "Clear topic.",
  strengths: [{ point: "Specific detail.", evidence_quote: "People walk in loops near the tea stall." }],
  primary_priority: { title: "Deepen reflection", explanation: "Say why it matters.", zh_note: null },
  prompt_alignment: { status: "partly", explanation: "Mostly." },
  categories: (["prompt_response", "specificity", "reflection", "structure_pacing", "clarity", "voice", "opening_ending", "concision"] as const).map((key) => ({
    key,
    label: "developing",
    explanation: `About ${key}.`,
    next_step: `Try one change for ${key}.`,
    passage_quote: null,
    zh_note: null,
  })),
  passage_comments: [
    { quote: "People walk in loops", observation: "Nice.", why_it_matters: "Shows noticing.", revision_question: "Why loops?", priority: "high", zh_note: null },
    { quote: "a sentence the student never wrote", observation: "x", why_it_matters: "y", revision_question: "z?", priority: "low", zh_note: null },
  ],
  revision_plan: [
    { task: "Add reflection.", why: "Core of prompt.", zh_note: null },
    { task: "Cut the general summary paragraph.", why: "It repeats.", zh_note: null },
    { task: "End on a specific image.", why: "Stronger close.", zh_note: null },
  ],
  voice_check: [{ question: "Does this sound like you?", note: "" }],
  questions_for_student: [],
  limitations: "AI can misread tone.",
};
