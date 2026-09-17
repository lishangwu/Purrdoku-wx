/** 测试运行器：打包 tests/*.test.ts → tests/.build/*.test.mjs → node --test */

import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const testsDir = path.join(root, "tests");
const outDir = path.join(testsDir, ".build");

const entries = fs
  .readdirSync(testsDir)
  .filter((name) => name.endsWith(".test.ts"))
  .map((name) => path.join(testsDir, name))
  .sort();

if (entries.length === 0) {
  console.error("没有找到测试文件");
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: entries,
  outdir: outDir,
  outExtension: { ".js": ".mjs" },
  bundle: true,
  format: "esm",
  platform: "node",
  target: ["node20"],
  charset: "utf8",
  loader: { ".json": "json" },
  external: ["node:*"],
  logLevel: "silent",
});

const files = fs
  .readdirSync(outDir)
  .filter((name) => name.endsWith(".test.mjs"))
  .map((name) => path.join(outDir, name));

const r = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(r.status ?? 1);
