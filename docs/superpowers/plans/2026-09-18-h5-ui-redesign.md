# H5 气质 UI 重设计实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 把微信小游戏 Canvas UI 从牛乳贴纸本改为贴近 H5/参考图的淡紫治愈风（色板、首页/对局骨架、浮层），玩法引擎不动。

**架构：** 在现有三文件 UI 层换皮重绘——`theme.ts` 提供色板与绘制原语，`paint.ts` 提供背景/猫/标记，`app.ts` 负责各屏布局与 hit 区。保留 `theme.cream` / `theme.seal` / `theme.mute` 等别名指向新色，降低漏改风险；设置 UI 隐藏未实现音效项。

**技术栈：** TypeScript、微信小游戏 Canvas 2D、esbuild、`node --test`

**规格：** `docs/superpowers/specs/2026-09-18-h5-ui-redesign-design.md`

---

## 文件结构

| 文件 | 职责 |
|------|------|
| 修改 `src/ui/theme.ts` | H5 色板、区域色、主按钮渐变填充辅助 |
| 修改 `src/ui/paint.ts` | 冷灰蓝背景、卡片阴影、首页圆框猫、星标 |
| 修改 `src/ui/app.ts` | 首页 / 对局 / 浮层布局与文案 |
| 修改 `src/engine/hint.ts` | `regionColorNames` 对齐新区域色名（提示文案可读） |
| 创建 `tests/theme.test.ts` | 锁定色板关键色值 |
| 生成 `game.js` | `npm run build` |

不改：`src/engine/*`（除 hint 色名）、`src/game/*`、存档 key、手势时序。

---

### 任务 1：主题色板与测试锁定

**文件：**
- 修改：`src/ui/theme.ts`
- 创建：`tests/theme.test.ts`

- [ ] **步骤 1：编写失败的色板测试**

```ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { theme } from "../src/ui/theme";

describe("H5 theme tokens", () => {
  it("uses the cozy lavender paper and accent from H5", () => {
    assert.equal(theme.paper, "#f4f8fc");
    assert.equal(theme.ink, "#293b52");
    assert.equal(theme.accent, "#8073f5");
    assert.equal(theme.regions[0], "#8976d8");
    assert.equal(theme.regions[5], "#a76c49");
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test`  
预期：FAIL（`theme.accent` 不存在或 `theme.paper` 仍为旧米纸色）

- [ ] **步骤 3：替换 `theme` 对象（保留旧别名）**

将 `src/ui/theme.ts` 顶部 `theme` 改为：

```ts
export const theme = {
  paper: "#f4f8fc",
  paperDeep: "#eaf1f7",
  surface: "#ffffff",
  ink: "#293b52",
  muted: "#647c9b",
  line: "#e0e9f3",
  accent: "#8073f5",
  accentSoft: "#9486ff",
  accentDeep: "#6966e9",
  accentEdge: "#605ed8",
  success: "#278b55",
  star: "#cbaa00",
  starFill: "#fbdb82",
  wrong: "#c43c28",
  hintTint: "#edf0ff",
  eyebrow: "#8976d8",
  regions: [
    "#8976d8",
    "#fbdb82",
    "#38a8bd",
    "#ce6e91",
    "#278b55",
    "#a76c49",
    "#ef98df",
    "#88d275",
    "#cbaa00",
  ],
  // 兼容别名：现有 app/paint 可逐步迁移
  cream: "#ffffff",
  mute: "#647c9b",
  seal: "#8073f5",
  sealDark: "#6966e9",
  cocoa: "#647c9b",
  moss: "#278b55",
};
```

并在同文件增加渐变主按钮辅助（供后续任务调用）：

```ts
export function fillPrimary(
  ctx: CanvasRenderingContext2DLike,
  rect: Rect,
  r: number,
): void {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, theme.accentSoft);
  g.addColorStop(1, theme.accentDeep);
  fillRound(ctx, rect, g as unknown as string, r);
  // 若运行时 fillStyle 不接受 gradient 强转，改为：
  // roundBox + ctx.fillStyle = g; ctx.fill();
}
```

**注意：** 微信 Canvas 的 `fillStyle` 支持 `CanvasGradient`。实现时用：

```ts
export function fillPrimary(
  ctx: CanvasRenderingContext2DLike,
  rect: Rect,
  r: number,
): void {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, theme.accentSoft);
  g.addColorStop(1, theme.accentDeep);
  ctx.fillStyle = g;
  roundBox(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.fill();
  ctx.strokeStyle = theme.accentEdge;
  ctx.lineWidth = 3;
  roundBox(ctx, rect.x, rect.y + 1, rect.w, rect.h, r);
  ctx.stroke();
}
```

若 `wx.d.ts` 里 `fillStyle` 类型过窄，同步放宽为 `string | CanvasGradientLike`（当前已支持）。

- [ ] **步骤 4：运行测试确认通过**

运行：`npm test`  
预期：`H5 theme tokens` PASS；其余既有测试仍 PASS

- [ ] **步骤 5：Commit**

```bash
git add src/ui/theme.ts tests/theme.test.ts
git commit -m "feat(ui): 换上 H5 淡紫主题色板"
```

---

### 任务 2：背景、卡片与猫绘制

**文件：**
- 修改：`src/ui/paint.ts`
- 修改：`src/engine/hint.ts`（仅 `regionColorNames`）

- [ ] **步骤 1：重写 `paintPaper` 为冷灰蓝光斑**

替换 `paintPaper` 主体为：

```ts
export function paintPaper(
  ctx: CanvasRenderingContext2DLike,
  w: number,
  h: number,
): void {
  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, w, h);
  const a = ctx.createRadialGradient(w * 0.25, h * 0.3, 0, w * 0.25, h * 0.3, w * 0.55);
  a.addColorStop(0, "rgba(216,236,239,0.55)");
  a.addColorStop(1, "rgba(216,236,239,0)");
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, w, h);
  const b = ctx.createRadialGradient(w * 0.85, h * 0.75, 0, w * 0.85, h * 0.75, w * 0.5);
  b.addColorStop(0, "rgba(225,233,239,0.5)");
  b.addColorStop(1, "rgba(225,233,239,0)");
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, w, h);
}
```

- [ ] **步骤 2：更新 `card` 阴影为冷色轻阴影，底色用 `theme.surface`**

```ts
export function card(ctx: CanvasRenderingContext2DLike, rect: Rect, radius = 22): void {
  ctx.shadowColor = "rgba(64,83,105,0.12)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  fillRound(ctx, rect, theme.surface, radius);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1;
  roundBox(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.stroke();
}
```

- [ ] **步骤 3：把 `drawPaw` 点亮色改为 `theme.starFill`，熄灭为 `theme.line`；`drawMark` 普通 × 用 `theme.muted`**

- [ ] **步骤 4：新增首页插画绘制函数**

在 `paint.ts` 增加：

```ts
export function drawHeroPortrait(
  ctx: CanvasRenderingContext2DLike,
  cx: number,
  cy: number,
  radius: number,
): void {
  // 1) 外圈白边 + 内填 #d7e8f2
  // 2) drawCat 居中略放大
  // 3) 白气泡「找到我了吗？」在右上
  // 4) 三个漂浮圆角方块：紫×、蓝★、黄叶（简化几何即可）
}
```

实现时气泡用 `fillRound` + `fillText`；装饰块尺寸约 `radius * 0.28`。

- [ ] **步骤 5：对齐提示色名**

`src/engine/hint.ts` 中：

```ts
export const regionColorNames = [
  "薰衣草紫",
  "奶油黄",
  "青蓝",
  "玫粉",
  "翠绿",
  "可可棕",
  "花粉",
  "嫩绿",
  "芥末金",
];
```

- [ ] **步骤 6：运行回归**

运行：`npm test`  
预期：全部 PASS（含既有 hint 测试；若有断言旧色名则同步改断言）

- [ ] **步骤 7：Commit**

```bash
git add src/ui/paint.ts src/engine/hint.ts
git commit -m "feat(ui): 冷色背景与首页圆框猫绘制"
```

---

### 任务 3：首页布局按参考图重排

**文件：**
- 修改：`src/ui/app.ts` 中 `drawHome`

- [ ] **步骤 1：重写 `drawHome` 自上而下结构**

顺序与文案（hit id 保持 `settings` / `start` / `daily` / `help`）：

1. 左：`● 各就喵位 · 猫咪逻辑游戏`（`theme.muted`，约 11px）  
2. 右：圆形齿轮 hit `settings`（白底 `theme.surface`，画简化齿轮或「⚙」）  
3. 字眉 `YOUR COZY PUZZLE CORNER`（`theme.eyebrow`，字距可用逐字 `fillText` 或单行）  
4. `Purrdoku` 大标题（`800 36px`）+ 小星；副文「不慌不忙，在色彩里让小猫各就各位」  
5. `drawHeroPortrait(ctx, cx, cy, r)`  
6. `fillPrimary` 主按钮：文案 `infinite.play ? "继续游戏 · PLAY" : "开始游戏 · PLAY"`；下小字「自动保存进度，随时接着玩。」  
7. 双卡片：每日「今天也来一局」；怎么玩「认识小猫的规则」  
8. 页脚「一点逻辑，一点治愈。」（可保留 stats 一行更小字在更下方，或并入页脚旁；优先参考图页脚，stats 可省略或缩小）

布局纵坐标用 `box.y + …` 相对比例，保证矮屏（约 640 高）主按钮仍可点。

- [ ] **步骤 2：类型检查与测试**

运行：`npm run check:types`；`npm test`  
预期：PASS

- [ ] **步骤 3：Commit**

```bash
git add src/ui/app.ts
git commit -m "feat(ui): 首页改为 H5 式布局"
```

---

### 任务 4：对局页布局

**文件：**
- 修改：`src/ui/app.ts` 中 `drawPlay`

- [ ] **步骤 1：顶栏与进度卡**

- 左圆钮 `back`、右圆钮 `more`（等同设置，保持 id）  
- 中：英文字眉（每日 `DAILY CHALLENGE` / 闯关 `LEVEL`）+ 中文标题  
- 下行：绿点 + `${difficultyName} · N×N` 与计时  
- 白进度卡：`cats / n 只猫已找到` + 三星（`drawPaw`）+ `失误 X 次`

- [ ] **步骤 2：三规则短条**

在棋盘上方画三个小白卡，文案：「一色一猫」「行列各一」「互不相邻」。窄屏 `box.w < 340` 时字号降到 9–10。

- [ ] **步骤 3：棋盘与底栏**

- 棋盘白底外框（`theme.surface`，圆角约 18，内边约 6）  
- 手势行：「● 轻点标记 × · 双击放猫 · 滑动连续标记」  
- 底栏四圆钮（圆直径约 48）：撤销 / 提示 / 重来 / 规则；提示钮可用 `theme.hintTint` 底  
- 可选页脚句：「每一只小猫，都有属于自己的角落。」  
- **优先保证 `boardRect` 可点面积**：若总高不够，先压缩规则条高度再压缩页脚

提示高亮（若 `modal === "hint" && hint` 或在应用前预览）：对 `hint.targets` 白粗边框，对 `hint.sources` 画小 ◆（可在本任务或任务 5 一并完成；计划要求任务 5 完成）。

- [ ] **步骤 4：运行测试**

运行：`npm test`  
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/ui/app.ts
git commit -m "feat(ui): 对局页对齐参考图骨架"
```

---

### 任务 5：浮层皮肤与文案

**文件：**
- 修改：`src/ui/app.ts` 中 `drawModal` 及相关 hit 处理

- [ ] **步骤 1：遮罩与通用标题**

- 遮罩改为 `rgba(41,59,82,0.35)`  
- 标题映射：

```ts
settings: "舒服地玩",
help: "给每只猫一个角落",
rules: "给每只猫一个角落",
hint: hint?.title ?? "提示",
result: "都找到啦",
restart: "重来一局",
clear: "清除进度",
```

关闭钮改为右上「✕」小圆，不必「关闭」二字。

- [ ] **步骤 2：设置**

- 副文「调成你喜欢的样子。」  
- 只渲染三行开关：`autoMarkEnabled`、`hapticEnabled`、`animationsEnabled`（带短说明可一行截断）  
- **不要**渲染 `soundEnabled` / `musicEnabled`  
- 开态轨道 `theme.accent`，关态 `theme.line`  
- 底部红色文字按钮「清除所有游戏进度」；小字版本说明「Purrdoku · 各就喵位」

- [ ] **步骤 3：怎么玩 / 规则**

三条编号规则 + 灰底手势说明 + `fillPrimary` 按钮「知道啦」（hit id 用现有 `close` 或新增 `gotIt` 映射到关浮层）。省略键盘行。

- [ ] **步骤 4：提示**

- 正文仍 `hint.reason`  
- 图例行：「白框：将标记 · ◆：推理依据」  
- 主按钮「应用」（保持 `applyHint`）  
- 按钮下小字「先自己想想」  
- 在 `drawPlay` 棋盘循环中：若当前 `hint` 非空，对 `targets`/`sources` 高亮

- [ ] **步骤 5：结果 / 重来 / 清除**

CTA 全部改用 `fillPrimary`；结果文案可改为更治愈语气，逻辑（`next` / `doRestart` / 清档）不变。

- [ ] **步骤 6：全量验证**

运行：`npm run check:types`；`npm test`；`npm run build`  
预期：类型通过；38+ 测试（含 theme）PASS；`game.js` 生成成功

- [ ] **步骤 7：Commit**

```bash
git add src/ui/app.ts game.js
git commit -m "feat(ui): 浮层改为 H5 文案与紫渐变按钮"
```

---

### 任务 6：对照验收

**文件：** 无强制代码；对照 `reference_image/` 与规格验收节

- [ ] **步骤 1：目视对照清单**

对照 `reference_image/首页.png`、`每日挑战.png`、`设置.png`、`怎么玩.png`、`提示.png`：

- [ ] 纸白/紫主色，无柿红米纸感  
- [ ] 首页双卡片 + 紫主按钮  
- [ ] 对局进度卡 + 底栏四圆钮  
- [ ] 设置无音效两项  
- [ ] 提示有应用按钮  

- [ ] **步骤 2：手工点按路径（开发者工具或浏览器 shim）**

首页 → 开始 → 放猫/标记 → 提示 → 设置开关 → 返回；每日挑战进局再返回。

- [ ] **步骤 3：若有偏差，小步修并 commit**

```bash
git add -u
git commit -m "fix(ui): 对照参考图微调间距与文案"
```

---

## 自检（写计划后）

| 规格章节 | 对应任务 |
|----------|----------|
| 视觉系统色板/区域色 | 任务 1 |
| 形状背景/猫插画 | 任务 2 |
| 首页布局 | 任务 3 |
| 对局布局 | 任务 4 |
| 浮层设置/怎么玩/提示/其他 | 任务 5 |
| 验收标准 | 任务 6 |
| 不改引擎/存档 | 各任务范围声明 |
| 隐藏音效 UI | 任务 5 步骤 2 |

无 TODO/待定占位；`fillPrimary` / hit id / 设置 key 命名前后一致。

---

## 执行交接

计划完成后提供两种执行方式（见下一条消息）。
