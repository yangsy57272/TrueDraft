import { mkdir, cp, rm, readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
const root = process.cwd();
const version = JSON.parse(await readFile("anna/package.json", "utf8")).version;
const name = `truedraft-anna-${version}-test`;
const stage = path.join(root, "dist", name);
await mkdir("dist", { recursive: true });
await rm(stage, { recursive: true, force: true });
await mkdir(stage);
// Explicit allowlist: never copy .env, .anna, databases, credentials, logs, node_modules or test exports.
for (const file of [
  "manifest.json",
  "app.json",
  "package.json",
  "package-lock.json",
  "README.md",
  "INSTALL.md",
  "ARCHITECTURE.md",
  "VALIDATION.md",
  "review",
  "bundle",
])
  await cp("anna/" + file, path.join(stage, file), { recursive: true });
async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out;
}
const hashes = [];
for (const file of await files(stage)) {
  const bytes = await readFile(file);
  hashes.push(
    createHash("sha256").update(bytes).digest("hex") +
      "  " +
      path.relative(stage, file),
  );
}
await writeFile(
  path.join(stage, "SHA256SUMS.txt"),
  hashes.sort().join("\n") + "\n",
);
const zip = path.join(root, "dist", name + ".zip");
await rm(zip, { force: true });
execFileSync("zip", ["-q", "-r", zip, name], { cwd: path.join(root, "dist") });
const hash = createHash("sha256")
  .update(await readFile(zip))
  .digest("hex");
await writeFile(zip + ".sha256", `${hash}  ${path.basename(zip)}\n`);
console.log(
  `Prepared ${path.relative(root, zip)} — fictional-data test candidate, not submitted.`,
);
