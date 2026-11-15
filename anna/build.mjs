import { build } from "esbuild";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
await mkdir(new URL("./bundle/", import.meta.url), { recursive: true });
const built = await build({
  entryPoints: ["anna/src/app.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  external: ["/static/anna-apps/_sdk/latest/index.js"],
  target: "es2022",
  outfile: "anna/bundle/app.js",
  tsconfig: "tsconfig.json",
  minify: true,
  metafile: true,
  legalComments: "none",
});
await copyFile("anna/src/index.html", "anna/bundle/index.html");
await copyFile("anna/src/app.css", "anna/bundle/app.css");
console.log("Anna static bundle built (no standalone server or database).");

await mkdir("tmp", { recursive: true });
await writeFile(
  "tmp/anna-build-inputs.json",
  JSON.stringify(Object.keys(built.metafile.inputs), null, 2),
);
