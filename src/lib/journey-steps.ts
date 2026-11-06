/**
 * The seven steps of the application journey, in order. Shared by the journey page and the step
 * bar shown on each step's own page. Each step has its own colour so a student can tell at a glance
 * where they are; every colour passes WCAG AA (4.5:1) with white text.
 */
export const JOURNEY_STEPS = [
  { key: "profile", href: "/profile", paths: ["/profile"], color: "#4338ca", soft: "#e0e7ff" },
  { key: "majors", href: "/majors", paths: ["/majors"], color: "#6d28d9", soft: "#ede9fe" },
  { key: "cds", href: "/cds", paths: ["/cds"], color: "#0369a1", soft: "#e0f2fe" },
  { key: "schools", href: "/schools", paths: ["/schools"], color: "#0f766e", soft: "#ccfbf1" },
  { key: "list", href: "/my-list", paths: ["/my-list"], color: "#c2410c", soft: "#ffedd5" },
  { key: "essays", href: "/dashboard", paths: ["/dashboard", "/essays"], color: "#be185d", soft: "#fce7f3" },
  { key: "track", href: "/my-list#deadlines", paths: [], color: "#15803d", soft: "#dcfce7" },
] as const;

export type JourneyStepKey = (typeof JOURNEY_STEPS)[number]["key"];

/** The step a page belongs to, if any (e.g. /schools/ohio-state → "schools"). */
export function stepForPath(pathname: string) {
  const i = JOURNEY_STEPS.findIndex((s) => s.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`)));
  return i < 0 ? null : i;
}
