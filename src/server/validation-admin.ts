import { z } from "zod";

export const schoolInputSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(1).max(160),
  nameZh: z.string().trim().max(80).nullish(),
  city: z.string().trim().max(80).nullish(),
  state: z.string().trim().regex(/^[A-Z]{2}$/).nullish().or(z.literal("")),
  control: z.enum(["public", "private"]).nullish(),
  website: z.string().trim().regex(/^https:\/\//).max(300).nullish().or(z.literal("")),
  cdsPageUrl: z.string().trim().regex(/^https:\/\//).max(500).nullish().or(z.literal("")),
  latestCdsYearListed: z.string().trim().regex(/^\d{4}-\d{4}$/).nullish().or(z.literal("")),
  published: z.boolean(),
});

export const datasetInputSchema = z.object({
  academicYear: z.string().trim(),
  sourceUrl: z.string().trim().max(500),
  data: z.record(z.string(), z.unknown()),
  verificationStatus: z.enum(["draft", "verified"]),
  published: z.boolean(),
  notes: z.string().max(2000).nullish(),
});
