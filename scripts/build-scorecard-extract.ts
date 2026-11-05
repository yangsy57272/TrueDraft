import { readFileSync, writeFileSync } from "node:fs";
import { CIP_CODES } from "../src/lib/planning";

/**
 * Build data/scorecard/institutions.json from the U.S. Department of Education's official College
 * Scorecard "Most Recent Cohorts – Institution" CSV (https://collegescorecard.ed.gov/data/).
 *
 *   npx tsx scripts/build-scorecard-extract.ts <Most-Recent-Cohorts-Institution.csv> <file-date YYYY-MM-DD>
 *
 * Included: institutions currently operating, predominantly awarding bachelor's degrees, public or
 * private nonprofit, not distance-only, with at least 200 undergraduates. Values are copied as
 * published; suppressed or missing values ("NA", "PrivacySuppressed") become null. Nothing is
 * estimated or filled in.
 */

function parseCsv(text: string): string[][] {
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
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const [, , csvPath, fileDate] = process.argv;
if (!csvPath || !/^\d{4}-\d{2}-\d{2}$/.test(fileDate ?? "")) {
  console.error("Usage: tsx scripts/build-scorecard-extract.ts <Most-Recent-Cohorts-Institution.csv> <file-date YYYY-MM-DD>");
  process.exit(2);
}

const rows = parseCsv(readFileSync(csvPath, "utf8").replace(/^﻿/, ""));
const header = rows[0];
const col = (name: string) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`Column ${name} not found`);
  return i;
};
const num = (v: string | undefined) => (v === undefined || v === "" || v === "NA" || v === "NULL" || v === "PrivacySuppressed" ? null : Number(v));
const int = (v: string | undefined) => {
  const n = num(v);
  return n === null || !Number.isFinite(n) ? null : Math.round(n);
};
const pct = (v: string | undefined) => {
  const n = num(v);
  return n === null || !Number.isFinite(n) ? null : Math.round(n * 1000) / 10; // share → percent, one decimal
};
const website = (v: string) => {
  const t = v.trim();
  if (!t) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t.replace(/^http:/i, "https:") : `https://${t}`;
  try {
    const u = new URL(withScheme);
    return `https://${u.hostname.toLowerCase()}`;
  } catch {
    return null;
  }
};

const C = Object.fromEntries(
  "UNITID INSTNM CITY STABBR INSTURL CONTROL PREDDEG CURROPER DISTANCEONLY UGDS ADM_RATE SATVR25 SATVR75 SATMT25 SATMT75 ACTCM25 ACTCMMID ACTCM75 UGDS_NRA TUITIONFEE_IN TUITIONFEE_OUT COSTT4_A C150_4 RET_FT4 ADMCON7"
    .split(" ")
    .map((k) => [k, col(k)]),
) as Record<string, number>;
const pcip = CIP_CODES.filter((c) => header.includes(`PCIP${c}`)).map((c) => [c, col(`PCIP${c}`)] as const);

const out = [];
for (const r of rows.slice(1)) {
  if (r.length < header.length) continue;
  const control = r[C.CONTROL];
  const ugds = int(r[C.UGDS]);
  if (r[C.CURROPER] !== "1" || r[C.PREDDEG] !== "3" || r[C.DISTANCEONLY] === "1") continue;
  if (control !== "1" && control !== "2") continue;
  if (ugds === null || ugds < 200) continue;
  const degreesByField: Record<string, number> = {};
  for (const [code, i] of pcip) {
    const p = pct(r[i]);
    if (p !== null && p > 0) degreesByField[code] = p;
  }
  const admcon = int(r[C.ADMCON7]);
  out.push({
    unitid: r[C.UNITID],
    name: r[C.INSTNM].trim(),
    city: r[C.CITY].trim() || null,
    state: r[C.STABBR].trim() || null,
    control: control === "1" ? "public" : "private",
    website: website(r[C.INSTURL]),
    admissionRate: pct(r[C.ADM_RATE]),
    satEbrw25: int(r[C.SATVR25]),
    satEbrw75: int(r[C.SATVR75]),
    satMath25: int(r[C.SATMT25]),
    satMath75: int(r[C.SATMT75]),
    actComposite25: int(r[C.ACTCM25]),
    actComposite50: int(r[C.ACTCMMID]),
    actComposite75: int(r[C.ACTCM75]),
    undergrads: ugds,
    intlSharePct: pct(r[C.UGDS_NRA]),
    tuitionInState: int(r[C.TUITIONFEE_IN]),
    tuitionOutOfState: int(r[C.TUITIONFEE_OUT]),
    costOfAttendance: int(r[C.COSTT4_A]),
    gradRatePct: pct(r[C.C150_4]),
    retentionRatePct: pct(r[C.RET_FT4]),
    testRequirement: admcon !== null && [1, 2, 3, 5].includes(admcon) ? admcon : null,
    degreesByField,
  });
}
out.sort((a, b) => a.name.localeCompare(b.name));

const doc = {
  source: "U.S. Department of Education, College Scorecard — Most Recent Cohorts (Institution)",
  sourceUrl: "https://collegescorecard.ed.gov/data/",
  fileDate,
  // Which period each value describes (from the official data dictionary's Most_Recent_Inst_Cohort_Map).
  periods: {
    admissions: { kind: "fall", year: 2024 },
    enrollment: { kind: "fall", year: 2024 },
    tuition: { kind: "academicYear", year: "2025-26" },
    costOfAttendance: { kind: "academicYear", year: "2024-25" },
    gradRate: { kind: "startedIn", year: 2019 },
    retention: { kind: "startedIn", year: 2023 },
    degrees: { kind: "academicYear", year: "2024-25" },
  },
  selection: "Currently operating, predominantly bachelor's-degree, public or private nonprofit, not distance-only, at least 200 undergraduates.",
  institutions: out,
};
writeFileSync("data/scorecard/institutions.json", JSON.stringify(doc));
console.log(`Wrote ${out.length} institutions to data/scorecard/institutions.json`);
