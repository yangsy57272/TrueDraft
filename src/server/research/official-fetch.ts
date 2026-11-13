import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

/** Pin the checked IPv4 address for the connection; never follow redirects implicitly. */
export function publicIpv4(ip: string) {
  if (isIP(ip) !== 4) return false;
  const [a,b,c] = ip.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || b === 88)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
export function institutionalRoot(website: string) {
  const host = new URL(website).hostname.toLowerCase().replace(/^www\./, "");
  if (isIP(host) || !host.includes(".") || host.endsWith(".local")) throw new Error("Invalid institution domain");
  // Do not derive a registrable domain from arbitrary suffixes or permit sibling institutions.
  return host;
}
export function officialUrl(value: string, root: string) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || (u.port && u.port !== "443") || u.username || u.password || u.hash.startsWith("#!")) return null;
    if (u.hostname !== root && !u.hostname.endsWith(`.${root}`)) return null;
    u.hash = ""; return u;
  } catch { return null; }
}
export async function fetchOfficial(value: string, root: string, signal?: AbortSignal, redirects = 0): Promise<{ url: string; html: string }> {
  const url = officialUrl(value, root);
  if (!url || redirects > 3) throw new Error("Non-institutional URL or redirect");
  const addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (!addresses.length || addresses.some(a => !publicIpv4(a.address))) throw new Error("Non-public destination");
  const result = await new Promise<{ html: string; redirect?: string }>((resolve, reject) => {
    const req = request(url, {
      signal, family: 4, lookup: (_host, _options, cb) => cb(null, addresses[0].address, 4),
      headers: { "User-Agent": "TrueDraftSchoolResearch/1.0 (official public pages only)", Accept: "text/html,application/xhtml+xml", "Accept-Encoding": "identity" },
    }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); resolve({ html: "", redirect: new URL(res.headers.location, url).href }); return;
      }
      if (res.statusCode !== 200 || !/text\/html|application\/xhtml\+xml/i.test(res.headers["content-type"] ?? "")) { res.resume(); reject(new Error("Page unavailable or unsupported format")); return; }
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 1_500_000) res.destroy(new Error("Page too large")); else chunks.push(chunk); });
      res.on("error", reject); res.on("end", () => resolve({ html: Buffer.concat(chunks).toString("utf8") }));
    });
    req.setTimeout(10000, () => req.destroy(new Error("Page timeout")));
    req.on("error", reject); req.end();
  });
  return result.redirect ? fetchOfficial(result.redirect, root, signal, redirects + 1) : { url: url.href, html: result.html };
}
