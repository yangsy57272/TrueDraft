export type AiProgress = {
  stage: string;
  generatedChars: number;
};

export const INITIAL_AI_PROGRESS: AiProgress = { stage: "checking", generatedChars: 0 };
