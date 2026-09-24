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
  const runtimeFiles = [
    "game.js",
    "game.json",
    "images/cat-1024.png",
    "assets/cat-atlas.png",
  ];
  const runtimeBytes = runtimeFiles.reduce(
    (total, file) => total + fs.statSync(path.join(root, file)).size,
    0,
  );
  const bundle = fs.readFileSync(path.join(root, "game.js"), "utf8");
  if (/data:image\/(?:png|jpe?g)/.test(bundle)) {
    throw new Error("game.js 不应内嵌运行时图片；请使用小游戏包内路径");
  }
  console.log(`运行时主包文件 ${(runtimeBytes / 1024).toFixed(1)} KB（含运行时图片）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
