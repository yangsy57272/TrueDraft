import { z } from "zod";

/** The current application cycle for supplemental essay prompts. */
export const SUPPLEMENT_CYCLE = "2026-2027";
export const SUPPLEMENT_STATUSES = ["confirmed", "coming_soon", "none"] as const;

const promptSchema = z.object({
  order: z.number().int().min(1).max(50),
  prompt: z.string().trim().min(5).max(4000),
  limitText: z.string().max(80).nullable(),
  limit: z.number().int().min(1).max(10000).nullable(),
  unit: z.enum(["words", "characters"]).nullable(),
  requirement: z.string().max(200).nullable(),
  notes: z.string().max(1000).nullable(),
});

export const supplementFileSchema = z.object({
  cycle: z.string().regex(/^\d{4}-\d{4}$/),
  description: z.string(),
  provenance: z.string().min(20),
  compiledListUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  schools: z.array(
    z
      .object({
        unitid: z.string().regex(/^\d+$/),
        directoryName: z.string(),
        sheetName: z.string(),
        status: z.enum(SUPPLEMENT_STATUSES),
        sourceUrl: z.url().nullable(),
        /** Optional external guide (College Essay Guy's free article), linked with attribution, never copied. */
        guideUrl: z.url().startsWith("https://www.collegeessayguy.com/").nullable(),
        prompts: z.array(promptSchema),
      })
      .refine((s) => (s.status === "confirmed" ? s.prompts.length > 0 : s.prompts.length === 0), {
        message: "confirmed schools need prompts; others must have none",
      })
      .refine((s) => s.prompts.every((p, i) => p.order === i + 1), { message: "prompt order must be 1..n" })
      .refine((s) => s.prompts.every((p) => (p.limit == null) === (p.unit == null)), { message: "limit and unit go together" }),
  ),
});
export type SupplementFile = z.infer<typeof supplementFileSchema>;

/**
 * The word limit to pre-fill in the essay form. Character limits are not word limits, so they are
 * left blank (the limit stays visible in the prompt text instead).
 */
export function wordLimitFor(p: { limit: number | null; unit: "words" | "characters" | null }) {
  return p.unit === "words" && p.limit != null && p.limit <= 5000 ? p.limit : null;
}
