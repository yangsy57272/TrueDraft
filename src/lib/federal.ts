/*
 * U.S. Department of Education (College Scorecard / IPEDS) data for a school, and how it combines
 * with an imported Common Data Set. Pure functions: shared by the server, pages, and unit tests.
 *
 * Rule: a value from the college's own CDS wins; otherwise the federal value is used. Every merged
 * value carries its source so the interface can say where each number came from.
 */

export type FederalData = {
  admissionRate?: number | null; // percent
  satEbrw25?: number | null;
  satEbrw75?: number | null;
  satMath25?: number | null;
  satMath75?: number | null;
  actComposite25?: number | null;
  actComposite50?: number | null;
  actComposite75?: number | null;
  undergrads?: number | null;
  intlSharePct?: number | null;
  tuitionInState?: number | null;
  tuitionOutOfState?: number | null;
  costOfAttendance?: number | null;
  gradRatePct?: number | null;
  retentionRatePct?: number | null;
  /** IPEDS ADMCON7: 1 required, 2 recommended, 3 neither required nor recommended, 5 considered but not required. */
  testRequirement?: 1 | 2 | 3 | 5 | null;
  degreesByField?: Record<string, number>;
  /** Which period each group of values describes, e.g. { admissions: { kind: "fall", year: 2024 } }. */
  periods?: Record<string, FederalPeriod>;
};
export type FederalPeriod = { kind: "fall" | "academicYear" | "startedIn"; year: number | string };

export type FederalTestPolicy = "required" | "recommended" | "considered" | "neither";
export function federalTestPolicy(code: FederalData["testRequirement"]): FederalTestPolicy | null {
  return code === 1 ? "required" : code === 2 ? "recommended" : code === 5 ? "considered" : code === 3 ? "neither" : null;
}

export type Sourced<T> = { value: T; source: "cds" | "federal" } | null;
const pick = <T>(cds: T | null | undefined, fed: T | null | undefined): Sourced<T> =>
  cds !== null && cds !== undefined ? { value: cds, source: "cds" } : fed !== null && fed !== undefined ? { value: fed, source: "federal" } : null;

type CdsLike = {
  data: Record<string, unknown>;
  derived: { admitRate?: number | null };
} | null;

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** The headline facts used by cards, filters, and sorting, each with its source. */
export function schoolFacts(cds: CdsLike, fed: FederalData | null) {
  const d = cds?.data ?? {};
  return {
    admitRate: pick(cds?.derived.admitRate ?? null, fed?.admissionRate ?? null),
    undergrads: pick(n(d.undergradTotal), fed?.undergrads ?? null),
    testPolicy: pick<string>(typeof d.testPolicy === "string" ? d.testPolicy : null, federalTestPolicy(fed?.testRequirement ?? null)),
    /** Tuition an international student would pay: CDS tuition, else federal out-of-state tuition and fees. */
    tuition: pick(n(d.tuition), fed?.tuitionOutOfState ?? null),
    gradRate: pick(n(d.gradRate6yr), fed?.gradRatePct ?? null),
    degreesByField: pick<Record<string, number>>(
      d.degreesByField && typeof d.degreesByField === "object" && Object.keys(d.degreesByField).length ? (d.degreesByField as Record<string, number>) : null,
      fed?.degreesByField && Object.keys(fed.degreesByField).length ? fed.degreesByField : null,
    ),
  };
}
export type SchoolFacts = ReturnType<typeof schoolFacts>;

/** Does a test-policy filter match? true / false / null (can't tell). */
export function testPolicyMatches(policy: Sourced<string>, wanted: string): boolean | null {
  if (!policy) return null;
  if (policy.source === "cds") return policy.value === wanted;
  // Federal categories are coarser. "Neither required nor recommended" rules out required and
  // recommended, but can't distinguish "considered if submitted" from "not considered".
  if (policy.value === "neither") return wanted === "required" || wanted === "recommended" ? false : null;
  return policy.value === wanted;
}

export const TUITION_BANDS: Record<string, [number, number]> = {
  under20k: [0, 20_000],
  "20to40k": [20_000, 40_000],
  "40to60k": [40_000, 60_000],
  over60k: [60_000, Number.POSITIVE_INFINITY],
};

export const SORTS = ["name", "admit_high", "admit_low", "tuition_low", "size_small", "size_large"] as const;
export type SortKey = (typeof SORTS)[number];
