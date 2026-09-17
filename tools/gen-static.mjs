import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, "tools", ".gen-static.mjs");

await build({
  entryPoints: [path.join(root, "src/engine/generate.ts")],
  outfile: out,
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});

const { generatePuzzle } = await import(pathToFileURL(out).href);
const levels = [];
for (let i = 0; i < 10; i++) {
  const level = generatePuzzle({
    seed: `purrdoku-static-${i}`,
    size: 6,
    scoreMin: 0,
    scoreMax: 24,
    combinations: false,
    easyGeometry: true,
    maxF: 3,
    maxR: 4,
    maxCandidates: 400,
  });
  if (!level) {
    console.error("failed", i);
    process.exit(1);
  }
  levels.push(level);
  console.log(i, level.rating?.score, level.signature);
}

const dest = path.join(root, "src/data/static.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(levels));
fs.rmSync(out, { force: true });
console.log("wrote", dest);
