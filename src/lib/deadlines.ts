import { z } from "zod";

/*
 * Application deadlines on a college-list entry. Pure helpers (no database or network) shared by
 * the server, the client, and unit tests.
 */

export const DEADLINE_TYPES = [
  "application",
  "early_decision",
  "early_decision_2",
  "early_action",
  "restrictive_early_action",
  "financial_aid",
  "scholarship",
  "interview",
  "portfolio",
  "test_scores",
  "other",
] as const;
export type DeadlineType = (typeof DEADLINE_TYPES)[number];

/** "local" means the student's own time zone, wherever they are when they look at it. */
export const LOCAL_TZ = "local";
export const MAX_DEADLINES = 10;
export const DUE_SOON_DAYS = 7;
/** Most application portals close at 11:59 pm when no time is given. */
export const DEFAULT_TIME = "23:59";

export function isValidTimeZone(tz: string) {
  if (tz === LOCAL_TZ) return true;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "invalid_date");

export const deadlineInputSchema = z
  .object({
    type: z.enum(DEADLINE_TYPES),
    date: isoDate,
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable()
      .optional(),
    timeZone: z.string().max(64).refine(isValidTimeZone, "invalid_time_zone").default(LOCAL_TZ),
    /** Where the date came from: the official page's URL or a short note. */
    source: z.string().trim().max(300).nullable().optional(),
    label: z.string().trim().max(60).nullable().optional(),
    done: z.boolean().default(false),
  })
  .strict();
export type DeadlineInput = z.infer<typeof deadlineInputSchema>;
export const deadlinePatchSchema = z
  .object({
    type: z.enum(DEADLINE_TYPES).optional(),
    date: isoDate.optional(),
    time: deadlineInputSchema.shape.time,
    timeZone: z.string().max(64).refine(isValidTimeZone, "invalid_time_zone").optional(),
    source: deadlineInputSchema.shape.source,
    label: deadlineInputSchema.shape.label,
    done: z.boolean().optional(),
  })
  .strict();

export type Deadline = {
  id: string;
  type: DeadlineType;
  date: string;
  time: string | null;
  timeZone: string;
  source: string | null;
  label?: string | null;
  done: boolean;
};

/** Offset (ms) between UTC and the wall clock in `timeZone` at the given instant. */
function zoneOffset(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant;
}

/**
 * The moment a deadline passes. Named zones are converted exactly (including DST); "local" uses the
 * viewer's zone, which is what applicants expect for portals that close at "11:59 pm your time".
 */
export function deadlineInstant(d: Pick<Deadline, "date" | "time" | "timeZone">, viewerTimeZone?: string): Date {
  const [y, m, day] = d.date.split("-").map(Number);
  const [hh, mm] = (d.time ?? DEFAULT_TIME).split(":").map(Number);
  const wall = Date.UTC(y, m - 1, day, hh, mm, 59);
  const tz = d.timeZone === LOCAL_TZ ? viewerTimeZone : d.timeZone;
  if (!tz) {
    // No zone known (e.g. server-side "local"): interpret in the runtime's own zone.
    return new Date(y, m - 1, day, hh, mm, 59);
  }
  // Two passes handle instants near a DST change.
  let guess = wall - zoneOffset(wall, tz);
  guess = wall - zoneOffset(guess, tz);
  return new Date(guess);
}

export type DeadlineState = "completed" | "overdue" | "due_soon" | "upcoming";

export function deadlineState(d: Deadline, now: Date = new Date(), viewerTimeZone?: string): DeadlineState {
  if (d.done) return "completed";
  const at = deadlineInstant(d, viewerTimeZone).getTime();
  if (at < now.getTime()) return "overdue";
  if (at - now.getTime() <= DUE_SOON_DAYS * 86_400_000) return "due_soon";
  return "upcoming";
}

/** Whole days from now until the deadline (negative once passed). */
export function daysUntil(d: Deadline, now: Date = new Date(), viewerTimeZone?: string) {
  return Math.floor((deadlineInstant(d, viewerTimeZone).getTime() - now.getTime()) / 86_400_000);
}

export const STATE_ORDER: Record<DeadlineState, number> = { overdue: 0, due_soon: 1, upcoming: 2, completed: 3 };
