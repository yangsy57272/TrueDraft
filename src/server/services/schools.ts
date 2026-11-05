import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cdsDataset, federalProfile, school, type CdsDataset, type School } from "@/db/schema";
import { schoolFacts, SORTS, testPolicyMatches, TUITION_BANDS, type FederalData, type SchoolFacts, type SortKey } from "@/lib/federal";
import {
  C7_FACTORS,
  C7_LEVELS,
  CDS_FIELDS,
  CIP_CODES,
  cdsDataSchema,
  derived,
  REGIONS,
  sizeBand,
  STATE_REGIONS,
  TEST_POLICIES,
  type CdsData,
} from "@/lib/planning";
import { ApiError } from "../errors";
import { recordAudit } from "./audit";

/*
 * Schools and their Common Data Set editions.
 *
 * Integrity rules:
 * - Values are only ever entered or imported by an administrator from the institution's own CDS
 *   document, with the document URL recorded.
 * - Imported data always starts as a draft. Only datasets an admin has marked "verified" can be
 *   published, and only published datasets are shown to students.
 * - Nothing is estimated: a missing value is displayed as "not reported".
 */

export type PublicDataset = {
  id: string;
  academicYear: string;
  sourceUrl: string;
  sourcePageRef: string | null;
  sourceExceptionReason: string | null;
  verificationMethod: string | null;
  data: CdsData;
  derived: ReturnType<typeof derived>;
  verifiedAt: Date | null;
  /** True when a named admin verified the values; false for automated imports not yet reviewed by a person. */
  reviewedByPerson: boolean;
};

function toPublic(d: CdsDataset): PublicDataset {
  const data = d.data as CdsData;
  return {
    id: d.id,
    academicYear: d.academicYear,
    sourceUrl: d.sourceUrl,
    sourcePageRef: d.sourcePageRef,
    sourceExceptionReason: d.sourceDomainException ? d.sourceExceptionReason : null,
    verificationMethod: d.verificationMethod,
    data,
    derived: derived(data),
    verifiedAt: d.verifiedAt,
    reviewedByPerson: d.verifiedBy != null,
  };
}

async function publishedDatasetsFor(schoolIds: string[]) {
  if (!schoolIds.length) return new Map<string, PublicDataset[]>();
  const rows = await db
    .select()
    .from(cdsDataset)
    .where(and(inArray(cdsDataset.schoolId, schoolIds), eq(cdsDataset.published, true), eq(cdsDataset.verificationStatus, "verified")))
    .orderBy(desc(cdsDataset.academicYear));
  const map = new Map<string, PublicDataset[]>();
  for (const r of rows) {
    const list = map.get(r.schoolId) ?? [];
    list.push(toPublic(r));
    map.set(r.schoolId, list);
  }
  return map;
}

export type SchoolFilters = {
  q?: string;
  regions?: string[];
  control?: string;
  sizes?: string[];
  testPolicy?: string;
  admitRate?: string; // under10 | 10to25 | 25to50 | over50
  tuition?: string; // under20k | 20to40k | 40to60k | over60k
  round?: string; // ed | ea
  intlAid?: string; // need | any
  field?: string; // CIP family
  sort?: string;
  page?: number;
};

const ADMIT_BANDS: Record<string, [number, number]> = { under10: [0, 10], "10to25": [10, 25], "25to50": [25, 50], over50: [50, 101] };
export const PAGE_SIZE = 24;

/** True when a filter needs school data (so schools without it can't be judged). */
export function usesDataFilters(f: SchoolFilters) {
  return Boolean(f.sizes?.length || f.testPolicy || f.admitRate || f.tuition || f.round || f.intlAid || f.field);
}

export type FederalView = { data: FederalData; fileDate: string; unitid: string };

async function federalProfilesFor(schoolIds?: string[]) {
  const rows = schoolIds
    ? schoolIds.length
      ? await db.select().from(federalProfile).where(inArray(federalProfile.schoolId, schoolIds))
      : []
    : await db.select().from(federalProfile);
  return new Map(rows.map((r) => [r.schoolId, { data: r.data as FederalData, fileDate: r.fileDate, unitid: r.unitid } satisfies FederalView]));
}

export type SchoolEntry = { school: School; latest: PublicDataset | null; federal: FederalView | null; facts: SchoolFacts };

/**
 * Three outcomes per school: it matches, it doesn't, or it can't be assessed because the data a
 * filter needs isn't available for it. Unassessable schools are returned separately so students
 * never mistake "no data" for "doesn't match". Values come from the college's own CDS when imported,
 * otherwise from U.S. Department of Education data; each carries its source.
 */
export type FilterKey = "size" | "testPolicy" | "admitRate" | "tuition" | "round" | "intlAid" | "field";

export async function searchSchools(filters: SchoolFilters) {
  const schools = await db.select().from(school).where(eq(school.published, true)).orderBy(asc(school.name));
  const [datasets, federal] = await Promise.all([publishedDatasetsFor(schools.map((s) => s.id)), federalProfilesFor()]);
  const q = filters.q?.trim().toLowerCase();
  const regions = (filters.regions ?? []).filter((r) => (REGIONS as readonly string[]).includes(r));
  const results: SchoolEntry[] = [];
  const unassessable: (SchoolEntry & { missing: FilterKey[] })[] = [];

  for (const s of schools) {
    const latest = datasets.get(s.id)?.[0] ?? null;
    const fed = federal.get(s.id) ?? null;
    if (q && !`${s.name} ${s.nameZh ?? ""} ${s.city ?? ""}`.toLowerCase().includes(q)) continue;
    if (regions.length && !regions.includes(STATE_REGIONS[s.state ?? ""] ?? "")) continue;
    if (filters.control && s.control !== filters.control) continue;

    const facts = schoolFacts(latest, fed?.data ?? null);
    const d = (latest?.data ?? {}) as CdsData;
    // Each check returns true (match), false (no match), or null (can't tell from the data we have).
    const checks: [FilterKey, boolean | null][] = [];
    if (filters.sizes?.length) {
      const band = sizeBand(facts.undergrads?.value ?? null);
      checks.push(["size", band == null ? null : filters.sizes.includes(band)]);
    }
    if (filters.testPolicy && (TEST_POLICIES as readonly string[]).includes(filters.testPolicy)) {
      checks.push(["testPolicy", testPolicyMatches(facts.testPolicy, filters.testPolicy)]);
    }
    if (filters.admitRate && ADMIT_BANDS[filters.admitRate]) {
      const rate = facts.admitRate?.value ?? null;
      const [lo, hi] = ADMIT_BANDS[filters.admitRate];
      checks.push(["admitRate", rate == null ? null : rate >= lo && rate < hi]);
    }
    if (filters.tuition && TUITION_BANDS[filters.tuition]) {
      const tuition = facts.tuition?.value ?? null;
      const [lo, hi] = TUITION_BANDS[filters.tuition];
      checks.push(["tuition", tuition == null ? null : tuition >= lo && tuition < hi]);
    }
    // Early plans and international aid are only in the Common Data Set.
    if (filters.round === "ed") checks.push(["round", typeof d.earlyDecision === "boolean" ? d.earlyDecision : null]);
    if (filters.round === "ea") checks.push(["round", typeof d.earlyAction === "boolean" ? d.earlyAction : null]);
    if (filters.intlAid) {
      const need = d.intlAidNeedBased;
      const merit = d.intlAidNonNeed;
      if (filters.intlAid === "need") checks.push(["intlAid", typeof need === "boolean" ? need : d.intlAidNotAvailable === true ? false : null]);
      else checks.push(["intlAid", need === true || merit === true ? true : need === false && merit === false ? false : d.intlAidNotAvailable === true ? false : null]);
    }
    if (filters.field && CIP_CODES.includes(filters.field)) {
      const degrees = facts.degreesByField?.value;
      checks.push(["field", !degrees ? null : (degrees[filters.field] ?? 0) > 0]);
    }

    if (checks.some(([, c]) => c === false)) continue;
    const missing = checks.filter(([, c]) => c === null).map(([k]) => k);
    const entry = { school: s, latest, federal: fed, facts };
    if (missing.length) unassessable.push({ ...entry, missing });
    else results.push(entry);
  }

  sortEntries(results, (filters.sort as SortKey) ?? "name");
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(filters.page ?? 1)), pages);
  return {
    results: results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    matchCount: results.length,
    page,
    pages,
    unassessable,
    hiddenForMissingData: unassessable.length,
    total: schools.length,
    withData: schools.filter((s) => datasets.has(s.id)).length,
    withFederal: schools.filter((s) => federal.has(s.id)).length,
  };
}

/** Sort in place. Schools missing the sort value go last, then by name. */
function sortEntries(list: SchoolEntry[], sort: SortKey) {
  const key: Record<SortKey, ((e: SchoolEntry) => number | null) | null> = {
    name: null,
    admit_high: (e) => (e.facts.admitRate ? -e.facts.admitRate.value : null),
    admit_low: (e) => e.facts.admitRate?.value ?? null,
    tuition_low: (e) => e.facts.tuition?.value ?? null,
    size_small: (e) => e.facts.undergrads?.value ?? null,
    size_large: (e) => (e.facts.undergrads ? -e.facts.undergrads.value : null),
  };
  const f = key[(SORTS as readonly string[]).includes(sort) ? sort : "name"];
  if (!f) return;
  list.sort((a, b) => {
    const va = f(a);
    const vb = f(b);
    if (va === null && vb === null) return a.school.name.localeCompare(b.school.name);
    if (va === null) return 1;
    if (vb === null) return -1;
    return va - vb || a.school.name.localeCompare(b.school.name);
  });
}

export async function getSchoolBySlug(slug: string) {
  const [row] = await db.select().from(school).where(and(eq(school.slug, slug), eq(school.published, true))).limit(1);
  if (!row) return null;
  const [datasets, federal] = await Promise.all([publishedDatasetsFor([row.id]), federalProfilesFor([row.id])]);
  return { school: row, datasets: datasets.get(row.id) ?? [], federal: federal.get(row.id) ?? null };
}

export async function getSchoolsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.select().from(school).where(and(inArray(school.id, ids), eq(school.published, true)));
  const [datasets, federal] = await Promise.all([publishedDatasetsFor(rows.map((r) => r.id)), federalProfilesFor(rows.map((r) => r.id))]);
  return ids
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is School => Boolean(r))
    .map((s) => {
      const latest = datasets.get(s.id)?.[0] ?? null;
      const fed = federal.get(s.id) ?? null;
      return { school: s, latest, federal: fed, facts: schoolFacts(latest, fed?.data ?? null) };
    });
}

/* --------------------------------- admin --------------------------------- */

export type SchoolInput = {
  slug: string;
  name: string;
  nameZh?: string | null;
  city?: string | null;
  state?: string | null;
  control?: "public" | "private" | null;
  website?: string | null;
  cdsPageUrl?: string | null;
  latestCdsYearListed?: string | null;
  published: boolean;
};

export async function adminListSchools() {
  const rows = await db
    .select({
      school,
      datasets: sql<number>`(select count(*)::int from cds_dataset cd where cd.school_id = "school"."id")`,
      published: sql<number>`(select count(*)::int from cds_dataset cd where cd.school_id = "school"."id" and cd.published)`,
    })
    .from(school)
    .orderBy(asc(school.name));
  return rows;
}

export async function adminGetSchool(id: string) {
  const [row] = await db.select().from(school).where(eq(school.id, id)).limit(1);
  if (!row) throw new ApiError(404, "not_found");
  const datasets = await db.select().from(cdsDataset).where(eq(cdsDataset.schoolId, id)).orderBy(desc(cdsDataset.academicYear));
  return { school: row, datasets };
}

function uniqueViolation(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

export async function adminUpsertSchool(adminId: string, id: string | null, input: SchoolInput) {
  try {
    if (id) {
      const [row] = await db.update(school).set(input).where(eq(school.id, id)).returning();
      if (!row) throw new ApiError(404, "not_found");
      await recordAudit(adminId, "admin_resource_changed", { action: "school_update", schoolId: id });
      return row;
    }
    const [row] = await db.insert(school).values(input).returning();
    await recordAudit(adminId, "admin_resource_changed", { action: "school_create", schoolId: row.id });
    return row;
  } catch (error) {
    if (uniqueViolation(error)) throw new ApiError(409, "slug_taken");
    throw error;
  }
}

export async function adminDeleteSchool(adminId: string, id: string) {
  const removed = await db.delete(school).where(eq(school.id, id)).returning({ id: school.id });
  if (!removed.length) throw new ApiError(404, "not_found");
  await recordAudit(adminId, "admin_resource_changed", { action: "school_delete", schoolId: id });
}

export type DatasetInput = {
  academicYear: string;
  sourceUrl: string;
  sourcePageRef?: string | null;
  sourceDomainException?: boolean;
  sourceExceptionReason?: string | null;
  verificationMethod?: string | null;
  data: unknown;
  verificationStatus: "draft" | "verified";
  published: boolean;
  notes?: string | null;
};

export function validateCdsData(data: unknown): CdsData {
  const parsed = cdsDataSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(400, "invalid_cds_data", { field: issue?.path.join(".") || "data", reason: issue?.message ?? "invalid" });
  }
  // Drop nulls/undefined so "not reported" is represented by absence.
  return Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== null && v !== undefined)) as unknown as CdsData;
}

/** "oira.harvard.edu" -> "harvard.edu" (good enough for .edu and most institutional hosts). */
export function baseDomain(url: string | null | undefined) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const parts = host.split(".");
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

/** True when the source document is on the institution's own website domain. */
export function isInstitutionalSource(sourceUrl: string, s: Pick<School, "website" | "cdsPageUrl">) {
  const src = baseDomain(sourceUrl);
  return Boolean(src && (src === baseDomain(s.website) || src === baseDomain(s.cdsPageUrl)));
}

export async function adminUpsertDataset(adminId: string, schoolId: string, datasetId: string | null, input: DatasetInput) {
  const yearMatch = /^(\d{4})-(\d{4})$/.exec(input.academicYear);
  if (!yearMatch || Number(yearMatch[2]) !== Number(yearMatch[1]) + 1) {
    throw new ApiError(400, "validation_failed", { field: "academicYear", reason: "format" });
  }
  if (!/^https:\/\//.test(input.sourceUrl)) throw new ApiError(400, "source_url_required");
  const [owner] = await db.select().from(school).where(eq(school.id, schoolId)).limit(1);
  if (!owner) throw new ApiError(404, "not_found");
  if (!isInstitutionalSource(input.sourceUrl, owner)) {
    if (!input.sourceDomainException) throw new ApiError(400, "source_not_institutional");
    if ((input.sourceExceptionReason ?? "").trim().length < 10) throw new ApiError(400, "source_exception_reason_required");
  }
  if (input.published && input.verificationStatus !== "verified") throw new ApiError(400, "must_verify_before_publish");
  const data = validateCdsData(input.data);
  const verified = input.verificationStatus === "verified";
  const values = {
    schoolId,
    academicYear: input.academicYear,
    sourceUrl: input.sourceUrl,
    sourcePageRef: input.sourcePageRef?.trim() || null,
    sourceDomainException: isInstitutionalSource(input.sourceUrl, owner) ? false : Boolean(input.sourceDomainException),
    sourceExceptionReason: isInstitutionalSource(input.sourceUrl, owner) ? null : input.sourceExceptionReason?.trim() || null,
    data,
    verificationStatus: input.verificationStatus,
    verifiedAt: verified ? new Date() : null,
    verifiedBy: verified ? adminId : null,
    verificationMethod: verified ? input.verificationMethod?.trim() || "admin-manual" : null,
    published: input.published,
    notes: input.notes ?? null,
  };
  try {
    if (datasetId) {
      const [row] = await db
        .update(cdsDataset)
        .set(values)
        .where(and(eq(cdsDataset.id, datasetId), eq(cdsDataset.schoolId, schoolId)))
        .returning();
      if (!row) throw new ApiError(404, "not_found");
      await recordAudit(adminId, "admin_resource_changed", { action: "cds_update", datasetId });
      return row;
    }
    const [row] = await db.insert(cdsDataset).values(values).returning();
    await recordAudit(adminId, "admin_resource_changed", { action: "cds_create", datasetId: row.id });
    return row;
  } catch (error) {
    if (uniqueViolation(error)) throw new ApiError(409, "dataset_year_exists");
    throw error;
  }
}

export async function adminDeleteDataset(adminId: string, datasetId: string) {
  const removed = await db.delete(cdsDataset).where(eq(cdsDataset.id, datasetId)).returning({ id: cdsDataset.id });
  if (!removed.length) throw new ApiError(404, "not_found");
  await recordAudit(adminId, "admin_resource_changed", { action: "cds_delete", datasetId });
}

/* ------------------------------- CSV import ------------------------------- */

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

/** Column names accepted by the importer (also used to build the downloadable template). */
export function csvColumns() {
  return [
    "school_slug",
    "academic_year",
    "source_url",
    "source_page_ref",
    "source_exception_reason",
    ...CDS_FIELDS.map((f) => f.key),
    ...C7_FACTORS.map((f) => `c7_${f}`),
    ...CIP_CODES.map((c) => `j1_${c}`),
  ];
}

function coerce(value: string, type: string): unknown {
  const v = value.trim();
  if (v === "") return undefined;
  if (type === "bool") {
    if (/^(true|yes|y|1|x)$/i.test(v)) return true;
    if (/^(false|no|n|0)$/i.test(v)) return false;
    return v; // let validation reject it
  }
  if (type === "monthday" || type === "enum") return v;
  const n = Number(v.replace(/[,$%\s]/g, ""));
  return Number.isFinite(n) ? n : v;
}

/** Import CDS rows as DRAFTS. Each row is validated; errors are reported per row, valid rows saved. */
export async function adminImportCsv(adminId: string, csvText: string) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new ApiError(400, "csv_empty");
  const header = rows[0].map((h) => h.trim());
  const known = new Set(csvColumns());
  const unknown = header.filter((h) => h && !known.has(h));
  if (unknown.length) throw new ApiError(400, "csv_unknown_columns", { columns: unknown.slice(0, 5).join(", ") });
  const types = new Map(CDS_FIELDS.map((f) => [f.key, f.type]));
  const report: { row: number; status: "imported" | "error"; message?: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = Object.fromEntries(header.map((h, j) => [h, rows[i][j] ?? ""]));
    try {
      const [s] = await db.select().from(school).where(eq(school.slug, cells.school_slug?.trim() ?? "")).limit(1);
      if (!s) throw new ApiError(400, "unknown_school");
      const data: Record<string, unknown> = {};
      const c7: Record<string, string> = {};
      const j1: Record<string, number> = {};
      for (const [key, raw] of Object.entries(cells)) {
        if (types.has(key)) {
          const v = coerce(raw, types.get(key)!);
          if (v !== undefined) data[key] = v;
        } else if (key.startsWith("c7_") && raw.trim()) {
          const level = raw.trim().toLowerCase().replace(/\s+/g, "_");
          if (!(C7_LEVELS as readonly string[]).includes(level)) throw new ApiError(400, "invalid_cds_data", { field: key, reason: "level" });
          c7[key.slice(3)] = level;
        } else if (key.startsWith("j1_") && raw.trim()) {
          j1[key.slice(3)] = Number(raw.replace(/[%\s]/g, ""));
        }
      }
      if (Object.keys(c7).length) data.c7 = c7;
      if (Object.keys(j1).length) data.degreesByField = j1;
      const [existing] = await db
        .select({ id: cdsDataset.id })
        .from(cdsDataset)
        .where(and(eq(cdsDataset.schoolId, s.id), eq(cdsDataset.academicYear, cells.academic_year?.trim() ?? "")))
        .limit(1);
      await adminUpsertDataset(adminId, s.id, existing?.id ?? null, {
        academicYear: cells.academic_year?.trim() ?? "",
        sourceUrl: cells.source_url?.trim() ?? "",
        sourcePageRef: cells.source_page_ref?.trim() || null,
        sourceDomainException: Boolean(cells.source_exception_reason?.trim()),
        sourceExceptionReason: cells.source_exception_reason?.trim() || null,
        data,
        verificationStatus: "draft",
        published: false,
        notes: "Imported from CSV — verify against the official document before publishing.",
      });
      report.push({ row: i + 1, status: "imported" });
    } catch (error) {
      const code = error instanceof ApiError ? `${error.code}${error.details?.field ? ` (${error.details.field})` : ""}` : "error";
      report.push({ row: i + 1, status: "error", message: code });
    }
  }
  return report;
}
