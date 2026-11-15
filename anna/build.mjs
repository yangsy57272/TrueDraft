import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";
await mkdir(new URL("./bundle/", import.meta.url), { recursive: true });
await build({
  entryPoints: ["anna/src/app.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  external: ["/static/anna-apps/_sdk/latest/index.js"],
  target: "es2022",
  outfile: "anna/bundle/app.js",
  tsconfig: "tsconfig.json",
  minify: true,
  legalComments: "none",
});
await copyFile("anna/src/index.html", "anna/bundle/index.html");
await copyFile("anna/src/app.css", "anna/bundle/app.css");
console.log("Anna static bundle built (no standalone server or database).");
