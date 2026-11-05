import { randomUUID } from "node:crypto";
import { CIP_FAMILIES, type StudentProfile } from "@/lib/planning";
import { normalizeForMatch } from "./guard";
import type { CvImport, MajorExplorer } from "./schemas";

/*
 * Pure functions for the planning tools: what is sent, and how model output is checked.
 * No database or network access, so they are unit-tested directly.
 */

/**
 * Text sent to the AI for Major Explorer. Data minimisation: test scores, GPA, graduation year,
 * and preferences are NOT included — they are irrelevant to exploring interests.
 */
export function profileToText(p: StudentProfile) {
  const lines: string[] = [];
  if (p.curriculum !== "unset") lines.push(`Curriculum: ${p.curriculum}`);
  if (p.courses.length) {
    lines.push("Courses:");
    for (const c of p.courses) lines.push(`- ${c.name} (${c.level}${c.grade ? `, grade ${c.grade}` : ""})`);
  }
  if (p.activities.length) {
    lines.push("Activities:");
    for (const a of p.activities) {
      const time = [a.hoursPerWeek ? `${a.hoursPerWeek} h/week` : null, a.weeksPerYear ? `${a.weeksPerYear} weeks/year` : null].filter(Boolean).join(", ");
      lines.push(`- [${a.type}] ${a.role}${a.organization ? `, ${a.organization}` : ""}: ${a.description}${a.grades.length ? ` (grades ${a.grades.join(", ")})` : ""}${time ? ` (${time})` : ""}`);
    }
  }
  if (p.honors.length) {
    lines.push("Honors:");
    for (const h of p.honors) lines.push(`- ${h.title} (${h.level})`);
  }
  if (p.interests.trim()) lines.push(`Interests and what I enjoy: ${p.interests.trim()}`);
  if (p.values.trim()) lines.push(`What matters to me: ${p.values.trim()}`);
  if (p.intendedMajors.length) lines.push(`Majors I'm already considering: ${p.intendedMajors.map((m) => m.name).join(", ")}`);
  return lines.join("\n");
}

function profileTerms(p: StudentProfile) {
  return [
    ...p.courses.map((c) => c.name),
    ...p.activities.flatMap((a) => [a.role, a.organization, a.description]),
    ...p.honors.map((h) => h.title),
    p.interests,
    p.values,
    ...p.intendedMajors.map((m) => m.name),
  ]
    .filter(Boolean)
    .map(normalizeForMatch);
}

/** A cited entry counts as grounded if it (or most of it) appears in the student's own profile. */
export function isGrounded(reference: string, terms: string[]) {
  const ref = normalizeForMatch(reference);
  if (ref.length < 2) return false;
  return terms.some((t) => t.includes(ref) || (ref.length > 3 && ref.includes(t) && t.length > 3));
}

export function guardMajorExplorer(data: MajorExplorer, profile: StudentProfile) {
  const terms = profileTerms(profile);
  const validCip = (c: string | null) => (c && CIP_FAMILIES[c] ? c : null);
  return {
    ...data,
    suggestions: data.suggestions.map((s) => ({
      ...s,
      cip_family: validCip(s.cip_family),
      based_on: s.based_on.map((ref) => ({ text: ref, grounded: isGrounded(ref, terms) })),
    })),
    broader_options: data.broader_options.map((b) => ({ ...b, cip_family: validCip(b.cip_family) })),
  };
}

/** Attach ids and flag items whose key text can't be found in the CV, so the student checks them. */
export function guardCvImport(data: CvImport, cvText: string) {
  const cv = normalizeForMatch(cvText);
  const found = (s: string) => {
    const n = normalizeForMatch(s);
    return n.length > 1 && cv.includes(n);
  };
  // The CV line an item came from, shown next to it during review (returned once, never stored).
  const lines = cvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const normalizedLines = lines.map(normalizeForMatch);
  const excerpt = (...needles: string[]) => {
    for (const needle of needles) {
      const n = normalizeForMatch(needle);
      if (n.length < 2) continue;
      const i = normalizedLines.findIndex((l) => l.includes(n));
      if (i >= 0) return lines[i].length > 200 ? `${lines[i].slice(0, 199)}…` : lines[i];
    }
    return null;
  };
  return {
    courses: data.courses.map((c) => ({ ...c, id: randomUUID(), grade: c.grade && c.grade >= 9 && c.grade <= 12 ? c.grade : null, foundInCv: found(c.name), excerpt: excerpt(c.name) })),
    activities: data.activities.map((a) => ({
      ...a,
      id: randomUUID(),
      hours_per_week: a.hours_per_week != null && a.hours_per_week >= 0 && a.hours_per_week <= 80 ? a.hours_per_week : null,
      weeks_per_year: a.weeks_per_year != null && a.weeks_per_year >= 0 && a.weeks_per_year <= 52 ? a.weeks_per_year : null,
      foundInCv: found(a.organization) || found(a.role),
      excerpt: excerpt(a.organization, a.role),
    })),
    honors: data.honors.map((h) => ({ ...h, id: randomUUID(), foundInCv: found(h.title), excerpt: excerpt(h.title) })),
    skipped_notes: data.skipped_notes,
  };
}

