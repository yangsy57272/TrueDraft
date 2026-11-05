import { z } from "zod";

/*
 * Shared (client-safe) definitions for the application-journey features:
 * student profile, intended majors, Common Data Set fields, and the college list.
 */

/* ------------------------------------------------------------------ */
/* Student profile                                                     */
/* ------------------------------------------------------------------ */

export const CURRICULA = ["ib", "a_level", "ap", "chinese_national", "ossd", "other", "unset"] as const;
export const COURSE_LEVELS = ["standard", "honors", "ap", "ib_hl", "ib_sl", "as_level", "a_level", "dual_enrollment", "other"] as const;
export const ACTIVITY_TYPES = [
  "academic",
  "arts",
  "athletics",
  "career",
  "community_service",
  "computer_tech",
  "cultural",
  "debate",
  "environmental",
  "family",
  "journalism",
  "music",
  "research",
  "robotics",
  "science_math",
  "student_government",
  "work",
  "other",
] as const;
export const HONOR_LEVELS = ["school", "regional", "national", "international"] as const;
export const GRADE_LEVELS = [9, 10, 11, 12] as const;
export const SIZE_PREFS = ["small", "medium", "large"] as const;
export const REGIONS = ["northeast", "mid_atlantic", "south", "midwest", "southwest", "west"] as const;
export const TEST_PLANS = ["submit", "not_submit", "undecided"] as const;
export const AID_NEEDS = ["yes", "no", "unsure"] as const;

const id = z.string().min(1).max(40);
const short = (max: number) => z.string().trim().max(max);
const optInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable().optional();

export const courseSchema = z.object({
  id,
  name: short(80).min(1),
  level: z.enum(COURSE_LEVELS),
  grade: z.union([z.literal(9), z.literal(10), z.literal(11), z.literal(12)]).nullable().optional(),
  result: short(20).optional(), // optional mark/predicted grade, e.g. "7", "A*", "95"
});

export const activitySchema = z.object({
  id,
  type: z.enum(ACTIVITY_TYPES),
  role: short(50),
  organization: short(100),
  description: short(150), // Common App-style 150-character limit
  grades: z.array(z.number().int().min(9).max(12)).max(4),
  hoursPerWeek: optInt(0, 80),
  weeksPerYear: optInt(0, 52),
});

export const honorSchema = z.object({
  id,
  title: short(100).min(1),
  level: z.enum(HONOR_LEVELS),
  grades: z.array(z.number().int().min(9).max(12)).max(4),
});

export const intendedMajorSchema = z.object({
  id,
  name: short(80).min(1),
  cipFamily: z.string().regex(/^\d{2}$/).nullable().optional(),
});

export const profileSchema = z.object({
  graduationYear: optInt(2024, 2035),
  curriculum: z.enum(CURRICULA).default("unset"),
  courses: z.array(courseSchema).max(40).default([]),
  activities: z.array(activitySchema).max(20).default([]),
  honors: z.array(honorSchema).max(10).default([]),
  tests: z
    .object({
      satTotal: optInt(400, 1600),
      satEbrw: optInt(200, 800),
      satMath: optInt(200, 800),
      actComposite: optInt(1, 36),
      toefl: optInt(0, 120),
      ielts: z.number().min(0).max(9).nullable().optional(),
      duolingo: optInt(10, 160),
      gpa: z.number().min(0).max(100).nullable().optional(),
      gpaScale: z.number().min(1).max(100).nullable().optional(),
    })
    .default({}),
  interests: short(1500).default(""),
  values: short(1000).default(""),
  preferences: z
    .object({
      sizes: z.array(z.enum(SIZE_PREFS)).max(3).default([]),
      regions: z.array(z.enum(REGIONS)).max(6).default([]),
      testPlan: z.enum(TEST_PLANS).default("undecided"),
      needAid: z.enum(AID_NEEDS).default("unsure"),
    })
    .default({ sizes: [], regions: [], testPlan: "undecided", needAid: "unsure" }),
  intendedMajors: z.array(intendedMajorSchema).max(8).default([]),
});

export type StudentProfile = z.infer<typeof profileSchema>;
export type Course = z.infer<typeof courseSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Honor = z.infer<typeof honorSchema>;

export const EMPTY_PROFILE: StudentProfile = profileSchema.parse({});

/* ------------------------------------------------------------------ */
/* Fields of study (2-digit CIP families used in CDS section J1)       */
/* ------------------------------------------------------------------ */

export const CIP_FAMILIES: Record<string, { en: string; zh: string }> = {
  "01": { en: "Agriculture", zh: "农业" },
  "03": { en: "Natural resources & conservation", zh: "自然资源与保护" },
  "04": { en: "Architecture", zh: "建筑" },
  "05": { en: "Area, ethnic & gender studies", zh: "区域、族裔与性别研究" },
  "09": { en: "Communication & journalism", zh: "传播与新闻" },
  "11": { en: "Computer & information sciences", zh: "计算机与信息科学" },
  "13": { en: "Education", zh: "教育" },
  "14": { en: "Engineering", zh: "工程" },
  "16": { en: "Foreign languages & literatures", zh: "外语与文学" },
  "22": { en: "Legal studies", zh: "法律研究" },
  "23": { en: "English language & literature", zh: "英语语言与文学" },
  "24": { en: "Liberal arts & general studies", zh: "文理通识" },
  "26": { en: "Biological & biomedical sciences", zh: "生物与生物医学" },
  "27": { en: "Mathematics & statistics", zh: "数学与统计" },
  "30": { en: "Interdisciplinary studies", zh: "跨学科研究" },
  "31": { en: "Parks, recreation & kinesiology", zh: "运动与休闲科学" },
  "38": { en: "Philosophy & religious studies", zh: "哲学与宗教研究" },
  "40": { en: "Physical sciences", zh: "物理科学" },
  "42": { en: "Psychology", zh: "心理学" },
  "44": { en: "Public administration & social service", zh: "公共管理与社会服务" },
  "45": { en: "Social sciences", zh: "社会科学" },
  "50": { en: "Visual & performing arts", zh: "视觉与表演艺术" },
  "51": { en: "Health professions", zh: "健康相关专业" },
  "52": { en: "Business & management", zh: "商科与管理" },
  "54": { en: "History", zh: "历史" },
};
export const CIP_CODES = Object.keys(CIP_FAMILIES);

/* ------------------------------------------------------------------ */
/* Common Data Set fields                                              */
/* ------------------------------------------------------------------ */

export const TEST_POLICIES = ["required", "recommended", "considered", "not_considered"] as const;
export const C7_LEVELS = ["very_important", "important", "considered", "not_considered"] as const;
export const C7_FACTORS = [
  "rigor",
  "class_rank",
  "gpa",
  "test_scores",
  "essay",
  "recommendations",
  "interview",
  "extracurriculars",
  "talent",
  "character",
  "first_generation",
  "alumni_relation",
  "geographical_residence",
  "state_residency",
  "religious_affiliation",
  "racial_ethnic_status",
  "volunteer_work",
  "work_experience",
  "demonstrated_interest",
] as const;
export const C7_ACADEMIC = new Set(["rigor", "class_rank", "gpa", "test_scores"]);

type FieldType = "int" | "percent" | "decimal" | "money" | "monthday" | "bool" | "enum";
export type CdsFieldDef = { key: string; item: string; section: "B" | "C" | "G" | "H" | "I"; type: FieldType; options?: readonly string[] };

/** Scalar CDS fields we store. `item` is the official CDS item number shown next to every value. */
export const CDS_FIELDS: CdsFieldDef[] = [
  { key: "undergradTotal", item: "B1", section: "B", type: "int" },
  { key: "intlUndergrads", item: "B2", section: "B", type: "int" },
  { key: "gradRate6yr", item: "B11", section: "B", type: "percent" },
  { key: "retentionRate", item: "B22", section: "B", type: "percent" },
  { key: "applicants", item: "C1", section: "C", type: "int" },
  { key: "admitted", item: "C1", section: "C", type: "int" },
  { key: "enrolled", item: "C1", section: "C", type: "int" },
  { key: "waitlistOffered", item: "C2", section: "C", type: "int" },
  { key: "waitlistAccepted", item: "C2", section: "C", type: "int" },
  { key: "waitlistAdmitted", item: "C2", section: "C", type: "int" },
  { key: "testPolicy", item: "C8", section: "C", type: "enum", options: TEST_POLICIES },
  { key: "satSubmitPct", item: "C9", section: "C", type: "percent" },
  { key: "actSubmitPct", item: "C9", section: "C", type: "percent" },
  { key: "satComposite25", item: "C9", section: "C", type: "int" },
  { key: "satComposite50", item: "C9", section: "C", type: "int" },
  { key: "satComposite75", item: "C9", section: "C", type: "int" },
  { key: "satEbrw25", item: "C9", section: "C", type: "int" },
  { key: "satEbrw75", item: "C9", section: "C", type: "int" },
  { key: "satMath25", item: "C9", section: "C", type: "int" },
  { key: "satMath75", item: "C9", section: "C", type: "int" },
  { key: "actComposite25", item: "C9", section: "C", type: "int" },
  { key: "actComposite50", item: "C9", section: "C", type: "int" },
  { key: "actComposite75", item: "C9", section: "C", type: "int" },
  { key: "avgGpa", item: "C12", section: "C", type: "decimal" },
  { key: "gpaSubmitPct", item: "C12", section: "C", type: "percent" },
  { key: "appFee", item: "C13", section: "C", type: "money" },
  { key: "regularDeadline", item: "C14", section: "C", type: "monthday" },
  { key: "earlyDecision", item: "C21", section: "C", type: "bool" },
  { key: "edDeadline", item: "C21", section: "C", type: "monthday" },
  { key: "edApplicants", item: "C21", section: "C", type: "int" },
  { key: "edAdmitted", item: "C21", section: "C", type: "int" },
  { key: "earlyAction", item: "C22", section: "C", type: "bool" },
  { key: "eaDeadline", item: "C22", section: "C", type: "monthday" },
  { key: "eaRestrictive", item: "C22", section: "C", type: "bool" },
  { key: "tuition", item: "G1", section: "G", type: "money" },
  { key: "requiredFees", item: "G1", section: "G", type: "money" },
  { key: "foodHousing", item: "G1", section: "G", type: "money" },
  { key: "intlAidNeedBased", item: "H6", section: "H", type: "bool" },
  { key: "intlAidNonNeed", item: "H6", section: "H", type: "bool" },
  { key: "intlAidNotAvailable", item: "H6", section: "H", type: "bool" },
  { key: "intlAidRecipients", item: "H6", section: "H", type: "int" },
  { key: "intlAidAverage", item: "H6", section: "H", type: "money" },
  { key: "studentFacultyRatio", item: "I2", section: "I", type: "decimal" },
];

/** Plausible bounds per field (inclusive). Anything outside is rejected rather than shown. */
export const CDS_BOUNDS: Record<string, [number, number]> = {
  undergradTotal: [1, 150_000],
  intlUndergrads: [0, 150_000],
  gradRate6yr: [0, 100],
  retentionRate: [0, 100],
  applicants: [1, 500_000],
  admitted: [0, 500_000],
  enrolled: [0, 100_000],
  waitlistOffered: [0, 200_000],
  waitlistAccepted: [0, 200_000],
  waitlistAdmitted: [0, 200_000],
  satSubmitPct: [0, 100],
  actSubmitPct: [0, 100],
  satComposite25: [400, 1600],
  satComposite50: [400, 1600],
  satComposite75: [400, 1600],
  satEbrw25: [200, 800],
  satEbrw75: [200, 800],
  satMath25: [200, 800],
  satMath75: [200, 800],
  actComposite25: [1, 36],
  actComposite50: [1, 36],
  actComposite75: [1, 36],
  avgGpa: [0, 5],
  gpaSubmitPct: [0, 100],
  appFee: [0, 500],
  edApplicants: [0, 200_000],
  edAdmitted: [0, 200_000],
  tuition: [0, 150_000],
  requiredFees: [0, 50_000],
  foodHousing: [0, 60_000],
  intlAidRecipients: [0, 150_000],
  intlAidAverage: [0, 150_000],
  studentFacultyRatio: [1, 100],
};

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** "MM-DD" that exists on a calendar (February 29 allowed). */
export function isValidMonthDay(value: string) {
  const m = /^(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const month = Number(m[1]);
  const day = Number(m[2]);
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1];
}

const nmonthday = z
  .string()
  .refine(isValidMonthDay, "not a real calendar date")
  .nullable()
  .optional();
const nbool = z.boolean().nullable().optional();

function scalarSchema(def: CdsFieldDef) {
  const [lo, hi] = CDS_BOUNDS[def.key] ?? [0, 1_000_000];
  switch (def.type) {
    case "int":
      return z.number().int().min(lo).max(hi).nullable().optional();
    case "percent":
    case "decimal":
    case "money":
      return z.number().min(lo).max(hi).nullable().optional();
    case "monthday":
      return nmonthday;
    case "bool":
      return nbool;
    case "enum":
      return z.enum(def.options as [string, ...string[]]).nullable().optional();
  }
}

/** Cross-field rules: [smaller, larger, message]. Checked only when both values are present. */
const ORDERED: [string, string, string][] = [
  ["admitted", "applicants", "admitted exceeds applicants"],
  ["enrolled", "admitted", "enrolled exceeds admitted"],
  ["edAdmitted", "edApplicants", "early decision admits exceed early decision applicants"],
  ["edApplicants", "applicants", "early decision applicants exceed all applicants"],
  ["edAdmitted", "admitted", "early decision admits exceed all admits"],
  ["intlUndergrads", "undergradTotal", "international undergraduates exceed all undergraduates"],
  ["waitlistAccepted", "waitlistOffered", "waitlist acceptances exceed offers"],
  ["waitlistAdmitted", "waitlistOffered", "waitlist admits exceed offers"],
  ["intlAidRecipients", "intlUndergrads", "international aid recipients exceed international undergraduates"],
  ["satComposite25", "satComposite50", "SAT 25th above 50th percentile"],
  ["satComposite50", "satComposite75", "SAT 50th above 75th percentile"],
  ["satComposite25", "satComposite75", "SAT 25th above 75th percentile"],
  ["satEbrw25", "satEbrw75", "SAT reading 25th above 75th"],
  ["satMath25", "satMath75", "SAT math 25th above 75th"],
  ["actComposite25", "actComposite50", "ACT 25th above 50th percentile"],
  ["actComposite50", "actComposite75", "ACT 50th above 75th percentile"],
  ["actComposite25", "actComposite75", "ACT 25th above 75th percentile"],
];

/** Every value is optional: a missing value is shown as "not available", never guessed. */
export const cdsDataSchema = z
  .object({
    ...Object.fromEntries(CDS_FIELDS.map((f) => [f.key, scalarSchema(f)])),
    c7: z.partialRecord(z.enum(C7_FACTORS), z.enum(C7_LEVELS)).optional(),
    degreesByField: z.record(z.string().regex(/^\d{2}$/), z.number().min(0).max(100)).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    const v = d as Record<string, unknown>;
    const n = (k: string) => (typeof v[k] === "number" ? (v[k] as number) : null);
    for (const [small, large, message] of ORDERED) {
      const a = n(small);
      const b = n(large);
      if (a != null && b != null && a > b) ctx.addIssue({ code: "custom", path: [small], message });
    }
    if (v.waitlistAdmitted != null && v.waitlistAccepted != null && n("waitlistAdmitted")! > n("waitlistAccepted")!) {
      ctx.addIssue({ code: "custom", path: ["waitlistAdmitted"], message: "waitlist admits exceed acceptances" });
    }
    // H6: "not available" can't coexist with an available type or with recipients/averages.
    if (v.intlAidNotAvailable === true) {
      if (v.intlAidNeedBased === true || v.intlAidNonNeed === true) {
        ctx.addIssue({ code: "custom", path: ["intlAidNotAvailable"], message: "aid marked both available and not available" });
      }
      if ((n("intlAidRecipients") ?? 0) > 0 || (n("intlAidAverage") ?? 0) > 0) {
        ctx.addIssue({ code: "custom", path: ["intlAidNotAvailable"], message: "aid recipients reported while aid is not available" });
      }
    }
    // Early-plan details require the plan.
    if (v.earlyDecision === false && (v.edDeadline != null || (n("edApplicants") ?? 0) > 0 || (n("edAdmitted") ?? 0) > 0)) {
      ctx.addIssue({ code: "custom", path: ["earlyDecision"], message: "early decision details reported without an early decision plan" });
    }
    if (v.earlyAction === false && (v.eaDeadline != null || v.eaRestrictive === true)) {
      ctx.addIssue({ code: "custom", path: ["earlyAction"], message: "early action details reported without an early action plan" });
    }
    const degrees = (v.degreesByField ?? {}) as Record<string, number>;
    const total = Object.values(degrees).reduce((a, b) => a + b, 0);
    if (total > 101) ctx.addIssue({ code: "custom", path: ["degreesByField"], message: "degree shares add up to more than 100%" });
  });

export type CdsData = { [key: string]: unknown } & {
  c7?: Partial<Record<(typeof C7_FACTORS)[number], (typeof C7_LEVELS)[number]>>;
  degreesByField?: Record<string, number>;
};

export function num(data: CdsData, key: string): number | null {
  const v = (data as Record<string, unknown>)[key];
  return typeof v === "number" ? v : null;
}

/** Derived figures, computed (never stored) so they always match the reported counts. */
export function derived(data: CdsData) {
  const applicants = num(data, "applicants");
  const admitted = num(data, "admitted");
  const enrolled = num(data, "enrolled");
  const edApplicants = num(data, "edApplicants");
  const edAdmitted = num(data, "edAdmitted");
  const pct = (a: number | null, b: number | null) => (a != null && b ? Math.round((a / b) * 1000) / 10 : null);
  return {
    admitRate: pct(admitted, applicants),
    yieldRate: pct(enrolled, admitted),
    edAdmitRate: pct(edAdmitted, edApplicants),
    intlShare: pct(num(data, "intlUndergrads"), num(data, "undergradTotal")),
  };
}

export function sizeBand(undergrads: number | null): (typeof SIZE_PREFS)[number] | null {
  if (undergrads == null) return null;
  if (undergrads < 5000) return "small";
  if (undergrads <= 15000) return "medium";
  return "large";
}

export const STATE_REGIONS: Record<string, (typeof REGIONS)[number]> = {
  CT: "northeast", ME: "northeast", MA: "northeast", NH: "northeast", RI: "northeast", VT: "northeast",
  NY: "mid_atlantic", NJ: "mid_atlantic", PA: "mid_atlantic", DE: "mid_atlantic", MD: "mid_atlantic", DC: "mid_atlantic",
  VA: "south", NC: "south", SC: "south", GA: "south", FL: "south", AL: "south", MS: "south", TN: "south", KY: "south", WV: "south", AR: "south", LA: "south",
  OH: "midwest", MI: "midwest", IN: "midwest", IL: "midwest", WI: "midwest", MN: "midwest", IA: "midwest", MO: "midwest", ND: "midwest", SD: "midwest", NE: "midwest", KS: "midwest",
  TX: "southwest", OK: "southwest", NM: "southwest", AZ: "southwest",
  CA: "west", OR: "west", WA: "west", NV: "west", UT: "west", CO: "west", ID: "west", MT: "west", WY: "west", AK: "west", HI: "west",
};

/* ------------------------------------------------------------------ */
/* College list                                                        */
/* ------------------------------------------------------------------ */

/** The student's OWN label — TrueDraft never computes or suggests one. */
export const LIST_CATEGORIES = ["reach", "target", "likely", "unsure"] as const;
export const APPLICATION_ROUNDS = ["undecided", "ed", "ed2", "ea", "rea", "rd", "rolling"] as const;
export const APPLICATION_PLATFORMS = ["common_app", "coalition", "uc", "school_portal", "ucas", "other"] as const;
export const APPLICATION_STATUSES = ["researching", "planning", "in_progress", "submitted", "admitted", "waitlisted", "deferred", "denied", "withdrawn"] as const;

export const DEFAULT_CHECKLIST = [
  "essays",
  "recommendations",
  "transcript",
  "test_scores",
  "english_test",
  "financial_aid",
  "application_fee",
] as const;

export const checklistItemSchema = z.object({
  id,
  key: z.string().max(40).nullable().optional(), // built-in item key, or null for a custom item
  label: short(80).optional(),
  done: z.boolean(),
});

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-31). */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "invalid_date");

const listEntryFields = {
  schoolId: z.string().uuid().nullable().optional(),
  customSchoolName: short(160).nullable().optional(),
  category: z.enum(LIST_CATEGORIES),
  round: z.enum(APPLICATION_ROUNDS),
  platform: z.enum(APPLICATION_PLATFORMS).nullable().optional(),
  deadline: isoDate.nullable().optional(),
  intendedMajor: short(120).nullable().optional(),
  status: z.enum(APPLICATION_STATUSES),
  notes: short(4000).nullable().optional(),
};

export const listEntryInputSchema = z.object({
  ...listEntryFields,
  category: listEntryFields.category.default("unsure"),
  round: listEntryFields.round.default("undecided"),
  status: listEntryFields.status.default("researching"),
  checklist: z.array(checklistItemSchema).max(30).optional(),
});

/**
 * Updates carry only the fields that changed. No defaults here: Zod applies defaults even inside
 * `.partial()`, which would silently reset fields the client didn't send. The checklist is changed
 * through per-item operations instead, so concurrent clicks can't overwrite each other.
 */
export const listEntryPatchSchema = z
  .object({
    customSchoolName: listEntryFields.customSchoolName,
    category: listEntryFields.category.optional(),
    round: listEntryFields.round.optional(),
    platform: listEntryFields.platform,
    deadline: listEntryFields.deadline,
    intendedMajor: listEntryFields.intendedMajor,
    status: listEntryFields.status.optional(),
    notes: listEntryFields.notes,
  })
  .strict();
export type ListEntryPatch = z.infer<typeof listEntryPatchSchema>;
export const MAX_CHECKLIST_ITEMS = 30;
export type ListEntryInput = z.infer<typeof listEntryInputSchema>;
