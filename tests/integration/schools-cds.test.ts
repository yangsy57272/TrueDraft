import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { cdsDataset, school } from "@/db/schema";
import { POST as createSchool } from "@/app/api/admin/schools/route";
import { POST as createDataset } from "@/app/api/admin/schools/[id]/cds/route";
import { PUT as updateDataset } from "@/app/api/admin/cds/[id]/route";
import { POST as importCsv } from "@/app/api/admin/cds/import/route";
import { POST as extract } from "@/app/api/admin/cds/extract/route";
import * as providerModule from "@/server/ai/provider";
import { getSchoolBySlug, parseCsv, searchSchools } from "@/server/services/schools";
import { ctx, json, readStream, req, signIn } from "../helpers/http";

let admin: { cookie: string; userId: string };
let student: { cookie: string; userId: string };
let schoolId: string;

const SCHOOL = { slug: "example-college", name: "Example College", state: "MA", control: "private", cdsPageUrl: "https://example.edu/cds", published: true };
const DATA = {
  undergradTotal: 3000,
  applicants: 10000,
  admitted: 1500,
  enrolled: 600,
  testPolicy: "considered",
  satComposite25: 1400,
  satComposite75: 1520,
  earlyDecision: true,
  intlAidNeedBased: true,
  c7: { essay: "very_important", interview: "considered" },
  degreesByField: { "11": 15, "45": 20 },
};
const dataset = (overrides: Record<string, unknown> = {}) => ({
  academicYear: "2025-2026",
  sourceUrl: "https://example.edu/cds-2025-2026.pdf",
  data: DATA,
  verificationStatus: "verified",
  published: true,
  notes: null,
  ...overrides,
});

beforeEach(async () => {
  admin = await signIn("admin@example.test");
  student = await signIn("student@example.test");
  const res = await createSchool(req("POST", "/x", { cookie: admin.cookie, body: SCHOOL }), undefined as never);
  schoolId = (await json(res)).id;
});
afterEach(() => vi.restoreAllMocks());

describe("CDS administration", () => {
  it("is restricted to administrators", async () => {
    expect((await createSchool(req("POST", "/x", { cookie: student.cookie, body: { ...SCHOOL, slug: "x" } }), undefined as never)).status).toBe(403);
    expect((await createDataset(req("POST", "/x", { cookie: student.cookie, body: dataset() }), ctx({ id: schoolId }))).status).toBe(403);
    expect((await importCsv(req("POST", "/x", { cookie: student.cookie, body: { csv: "a" } }), undefined as never)).status).toBe(403);
  });

  it("rejects inconsistent or unsourced data", async () => {
    const bad = await createDataset(req("POST", "/x", { cookie: admin.cookie, body: dataset({ data: { applicants: 100, admitted: 200 } }) }), ctx({ id: schoolId }));
    expect((await json(bad)).error.code).toBe("invalid_cds_data");
    const range = await createDataset(req("POST", "/x", { cookie: admin.cookie, body: dataset({ data: { satComposite25: 1500, satComposite75: 1400 } }) }), ctx({ id: schoolId }));
    expect(range.status).toBe(400);
    const unknown = await createDataset(req("POST", "/x", { cookie: admin.cookie, body: dataset({ data: { admitProbability: 0.3 } }) }), ctx({ id: schoolId }));
    expect(unknown.status).toBe(400);
    const noSource = await createDataset(req("POST", "/x", { cookie: admin.cookie, body: dataset({ sourceUrl: "http://example.edu/x.pdf" }) }), ctx({ id: schoolId }));
    expect((await json(noSource)).error.code).toBe("source_url_required");
    const unverified = await createDataset(req("POST", "/x", { cookie: admin.cookie, body: dataset({ verificationStatus: "draft", published: true }) }), ctx({ id: schoolId }));
    expect((await json(unverified)).error.code).toBe("must_verify_before_publish");
  });

  it("shows students only verified, published data — with derived rates computed, not stored", async () => {
    const created = await json(await createDataset(req("POST", "/x", { cookie: admin.cookie, body: dataset({ verificationStatus: "draft", published: false }) }), ctx({ id: schoolId })));
    expect((await getSchoolBySlug("example-college"))!.datasets).toHaveLength(0);
    await updateDataset(req("PUT", "/x", { cookie: admin.cookie, body: dataset() }), ctx({ id: created.id }));
    const found = (await getSchoolBySlug("example-college"))!;
    expect(found.datasets).toHaveLength(1);
    expect(found.datasets[0].derived.admitRate).toBe(15);
    expect(found.datasets[0].derived.yieldRate).toBe(40);
    expect(found.datasets[0].verifiedAt).not.toBeNull();
  });

  it("filters by CDS values and reports schools hidden for missing data", async () => {
    await createDataset(req("POST", "/x", { cookie: admin.cookie, body: dataset() }), ctx({ id: schoolId }));
    await db.insert(school).values({ slug: "no-data-u", name: "No Data University", state: "CA", published: true });
    const all = await searchSchools({});
    expect(all.results).toHaveLength(2);
    const filtered = await searchSchools({ admitRate: "10to25", testPolicy: "considered", round: "ed", intlAid: "need", field: "11" });
    expect(filtered.results.map((r) => r.school.slug)).toEqual(["example-college"]);
    expect(filtered.hiddenForMissingData).toBe(1);
    expect((await searchSchools({ admitRate: "under10" })).results).toHaveLength(0);
    expect((await searchSchools({ regions: ["west"] })).results.map((r) => r.school.slug)).toEqual(["no-data-u"]);
    expect((await searchSchools({ q: "example" })).results).toHaveLength(1);
  });

  it("imports CSV rows as unpublished drafts and reports row errors", async () => {
    const csv = [
      "school_slug,academic_year,source_url,applicants,admitted,testPolicy,c7_essay,j1_11",
      'example-college,2024-2025,https://example.edu/cds-2024.pdf,"9,000",1200,required,Very Important,14',
      "missing-school,2024-2025,https://x.edu/cds.pdf,1,1,,,",
    ].join("\n");
    const res = await json(await importCsv(req("POST", "/x", { cookie: admin.cookie, body: { csv } }), undefined as never));
    expect(res.report[0].status).toBe("imported");
    expect(res.report[1]).toMatchObject({ status: "error" });
    const rows = await db.select().from(cdsDataset);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ verificationStatus: "draft", published: false });
    expect(rows[0].data).toMatchObject({ applicants: 9000, admitted: 1200, testPolicy: "required", c7: { essay: "very_important" }, degreesByField: { "11": 14 } });
    const bad = await importCsv(req("POST", "/x", { cookie: admin.cookie, body: { csv: "school_slug,admission_odds\nx,1" } }), undefined as never);
    expect((await json(bad)).error.code).toBe("csv_unknown_columns");
  });

  it("parses quoted CSV fields", () => {
    expect(parseCsv('a,"b,c","d ""e"""\r\n1,2,3')).toEqual([
      ["a", "b,c", 'd "e"'],
      ["1", "2", "3"],
    ]);
  });

  it("AI pre-fill returns only known fields and saves nothing", async () => {
    await consentFor();
    vi.spyOn(providerModule, "getProvider").mockResolvedValue({
      kind: "fake",
      model: "fake",
      async generate() {
        return {
          json: {
            ...Object.fromEntries(
              ["undergradTotal","intlUndergrads","gradRate6yr","retentionRate","applicants","admitted","enrolled","waitlistOffered","waitlistAccepted","waitlistAdmitted","testPolicy","satSubmitPct","actSubmitPct","satComposite25","satComposite50","satComposite75","satEbrw25","satEbrw75","satMath25","satMath75","actComposite25","actComposite50","actComposite75","avgGpa","gpaSubmitPct","appFee","regularDeadline","earlyDecision","edDeadline","edApplicants","edAdmitted","earlyAction","eaDeadline","eaRestrictive","tuition","requiredFees","foodHousing","intlAidNeedBased","intlAidNonNeed","intlAidNotAvailable","intlAidRecipients","intlAidAverage","studentFacultyRatio"].map((k) => [k, null]),
            ),
            applicants: 5000,
            admitted: 900,
            c7: [{ factor: "essay", level: "important" }],
            degrees_by_field: [{ cip_family: "11", percent: 12 }, { cip_family: "99", percent: 5 }],
            uncertain_fields: ["enrolled"],
          },
          model: "fake",
          providerRef: null,
        };
      },
    });
    const events = await readStream(await extract(req("POST", "/x", { cookie: admin.cookie, body: { text: "C1 Total first-time first-year applicants 5000 admitted 900" } }), undefined as never));
    const done = events.find((e) => e.type === "done");
    expect(done.data).toEqual({ applicants: 5000, admitted: 900, c7: { essay: "important" }, degreesByField: { "11": 12 } });
    expect(done.uncertainFields).toEqual(["enrolled"]);
    expect(await db.select().from(cdsDataset)).toHaveLength(0);
    const asStudent = await extract(req("POST", "/x", { cookie: student.cookie, body: { text: "C1 Total first-time first-year applicants" } }), undefined as never);
    expect(asStudent.status).toBe(403);
  });
});

async function consentFor() {
  // The extraction tool is an admin data tool on public documents; it doesn't need student consent.
  return Promise.resolve();
}
