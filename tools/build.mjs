/** 构建小游戏主包 game.js */

import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function main() {
  const mainResult = await build({
    entryPoints: [path.join(root, "src/main.ts")],
    outfile: path.join(root, "game.js"),
    bundle: true,
    format: "cjs",
    platform: "neutral",
    target: ["es2019"],
    charset: "utf8",
    minify: true,
    loader: {
      ".png": "dataurl",
      ".jpg": "dataurl",
      ".jpeg": "dataurl",
      ".json": "json",
    },
    metafile: true,
    logLevel: "silent",
    legalComments: "none",
  });

  const rows = Object.entries(mainResult.metafile.outputs)
    .flatMap(([, out]) => Object.entries(out.inputs))
    .map(([file, info]) => ({
      file: file.replace(root + path.sep, ""),
      bytes: info.bytesInOutput,
    }))
    .sort((a, b) => b.bytes - a.bytes);
  console.log("主包成分（按体积）：");
  for (const r of rows.slice(0, 12)) {
    console.log(`  ${String(r.bytes).padStart(7)}  ${r.file}`);
  }
  const gameJs = fs.statSync(path.join(root, "game.js")).size;
  console.log(`game.js ${(gameJs / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
