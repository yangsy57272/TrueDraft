import "server-only";
import { getSchoolBySlug } from "@/server/services/schools";
import { ApiError } from "@/server/errors";
import type { ResearchEvidence } from "@/lib/school-research";
import { fetchOfficial, institutionalRoot, officialUrl } from "./official-fetch";

export function plainText(html: string) {
  return html.replace(/<(script|style|nav|header|footer|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;|&#160;/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}
export function pageLinks(html: string, current: string, root: string, program: string) {
  const terms = program.toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 2);
  return [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => {
    let u: URL | null = null; try { u = officialUrl(new URL(m[1].replace(/&amp;/g, "&"), current).href, root); } catch { /* malformed link */ }
    const label = `${m[1]} ${plainText(m[2])}`.toLowerCase();
    const score = terms.reduce((n,t) => n + (label.includes(t) ? 6 : 0), 0) + (/course|curricul|module|program|undergrad|admission|entrance|requirement/.test(label) ? 3 : 0) + (/faculty|people|research|club|societ|student.life|organization/.test(label) ? 2 : 0);
    return { url: u?.href, score };
  }).filter((l): l is {url: string; score: number} => Boolean(l.url && l.score > 0 && !/\.(pdf|jpg|png|zip|xlsx?|docx?)($|\?)/i.test(l.url))).sort((a,b) => b.score-a.score);
}
const cache = new Map<string, { until: number; value: ResearchEvidence }>();
/** Public evidence only; no applicant text is sent to institution websites. Bounded discovery, not an exhaustive crawl. */
export async function collectResearch(slug: string, program: string, extraUrls: string[] = []): Promise<ResearchEvidence> {
  const found = await getSchoolBySlug(slug);
  if (!found?.school.website) throw new ApiError(404, "not_found");
  const s = found.school; const root = institutionalRoot(s.website!);
  if (extraUrls.some(u => !officialUrl(u, root))) throw new ApiError(400, "source_not_institutional");
  const key = JSON.stringify([slug, program, extraUrls]); const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  const initial = new URL(s.website!); initial.protocol = "https:";
  const queue = [...extraUrls.map(url => ({url,score:100})), {url:initial.href,score:0}];
  const seen = new Set<string>(); const sources: ResearchEvidence["sources"] = []; let attempted = 0, unavailable = 0;
  const deadline = AbortSignal.timeout(55000);
  while (queue.length && attempted < 12 && !deadline.aborted) {
    const next = queue.shift()!; if (seen.has(next.url)) continue;
    seen.add(next.url); attempted++;
    try {
      const page = await fetchOfficial(next.url, root, AbortSignal.any([deadline, AbortSignal.timeout(11000)]));
      const text = plainText(page.html); const title = plainText(page.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? s.name).slice(0,200);
      if (text.length > 100) {
        // Prefer text around subject matches, while retaining the page opening for context.
        const terms = program.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
        const spots = terms.flatMap(t => { const i = text.toLowerCase().indexOf(t); return i >= 0 ? [text.slice(Math.max(0,i-250), i+4000)] : []; });
        const excerpt = [...new Set([text.slice(0,3500), ...spots])].join("\n[…]\n").slice(0,6500);
        sources.push({ id:`S${sources.length+1}`,url:page.url,title,checkedAt:new Date().toISOString(),excerpt });
      }
      queue.push(...pageLinks(page.html,page.url,root,program).filter(l => !seen.has(l.url)).slice(0,30)); queue.sort((a,b)=>b.score-a.score); queue.splice(70);
    } catch { unavailable++; }
  }
  const value: ResearchEvidence = { schoolSlug:slug,schoolName:s.name,country:s.country,program,requestedUrls:extraUrls,sources,attempted,unavailable,
    scope:"Bounded official-site discovery (up to 12 HTML pages, 55 seconds). Not exhaustive or a guarantee of current teaching/eligibility. PDFs, login pages, blocked pages and other institutional domains require separate checking." };
  if (cache.size >= 80) cache.delete(cache.keys().next().value!);
  cache.set(key,{until:Date.now()+30*60*1000,value}); return value;
}
