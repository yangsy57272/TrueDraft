import { describe, expect, it } from "vitest";
import { federalTestPolicy, schoolFacts, testPolicyMatches } from "@/lib/federal";

const fed = { admissionRate: 83.6, undergrads: 22264, tuitionOutOfState: 33710, gradRatePct: 75.8, testRequirement: 5 as const, degreesByField: { "52": 24 } };

describe("combining CDS and federal data", () => {
  it("uses the college's own CDS value when there is one, and says where each value came from", () => {
    const cds = { data: { undergradTotal: 22000, testPolicy: "required" }, derived: { admitRate: 80 } };
    const f = schoolFacts(cds, fed);
    expect(f.admitRate).toEqual({ value: 80, source: "cds" });
    expect(f.undergrads).toEqual({ value: 22000, source: "cds" });
    expect(f.testPolicy).toEqual({ value: "required", source: "cds" });
    // Not in this CDS, so the federal value fills in, labelled as such.
    expect(f.tuition).toEqual({ value: 33710, source: "federal" });
    expect(f.degreesByField).toEqual({ value: { "52": 24 }, source: "federal" });
  });

  it("falls back to federal data entirely when no CDS is imported, and never invents values", () => {
    const f = schoolFacts(null, fed);
    expect(f.admitRate).toEqual({ value: 83.6, source: "federal" });
    expect(f.testPolicy).toEqual({ value: "considered", source: "federal" });
    expect(schoolFacts(null, null)).toEqual({ admitRate: null, undergrads: null, testPolicy: null, tuition: null, gradRate: null, degreesByField: null });
  });

  it("treats the coarser federal test categories honestly", () => {
    expect(federalTestPolicy(1)).toBe("required");
    expect(federalTestPolicy(3)).toBe("neither");
    const neither = { value: "neither", source: "federal" as const };
    expect(testPolicyMatches(neither, "required")).toBe(false);
    expect(testPolicyMatches(neither, "recommended")).toBe(false);
    expect(testPolicyMatches(neither, "considered")).toBeNull(); // could be test-optional or test-blind
    expect(testPolicyMatches(neither, "not_considered")).toBeNull();
    expect(testPolicyMatches({ value: "considered", source: "federal" }, "considered")).toBe(true);
    expect(testPolicyMatches(null, "required")).toBeNull();
  });
});
