import { fillRound, roundBox, theme, type Rect } from "./theme";
import { HERO_CAT_SRC } from "./hero-cat";
import { CAT_BLINK_SRC } from "./cat-blink";

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

export function drawCat(
  ctx: CanvasRenderingContext2DLike,
  x: number,
  y: number,
  s: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = theme.cream;
  ctx.beginPath();
  ctx.ellipse(0, 18, 28, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -6, 20, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-18, -14);
  ctx.lineTo(-26, -34);
  ctx.lineTo(-6, -20);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, -14);
  ctx.lineTo(26, -34);
  ctx.lineTo(6, -20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.moveTo(-18, -14);
  ctx.lineTo(-24, -30);
  ctx.lineTo(-10, -18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-10, 8, 7, 9, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(16, 20, 6, 8, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.seal;
  ctx.beginPath();
  ctx.ellipse(0, -2, 3.2, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(-7, -8, 2.2, 0, Math.PI * 2);
  ctx.arc(7, -8, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-18, -1);
  ctx.quadraticCurveTo(-34, 2, -40, -2);
  ctx.moveTo(-18, 3);
  ctx.quadraticCurveTo(-32, 8, -38, 10);
  ctx.moveTo(18, -1);
  ctx.quadraticCurveTo(34, 2, 40, -2);
  ctx.moveTo(18, 3);
  ctx.quadraticCurveTo(32, 8, 38, 10);
  ctx.stroke();
  ctx.restore();
}

export function drawPaw(
  ctx: CanvasRenderingContext2DLike,
  x: number,
  y: number,
  on: boolean,
): void {
  ctx.fillStyle = on ? theme.starFill : theme.line;
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy] of [
    [-7, -4],
    [-2, -7],
    [4, -6],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy, 2.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawMark(
  ctx: CanvasRenderingContext2DLike,
  cx: number,
  cy: number,
  size: number,
  wrong: boolean,
): void {
  ctx.strokeStyle = wrong ? theme.wrong : "#ffffff";
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.lineCap = "round";
  const r = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r);
  ctx.lineTo(cx + r, cy + r);
  ctx.moveTo(cx + r, cy - r);
  ctx.lineTo(cx - r, cy + r);
  ctx.stroke();
}

export function drawMiniCat(
  ctx: CanvasRenderingContext2DLike,
  cx: number,
  cy: number,
  size: number,
  _face = 0,
): void {
  if (drawBlinkCat(ctx, cx, cy, size)) return;
  const s = size / 70;
  ctx.save();
  ctx.translate(cx, cy + size * 0.08);
  ctx.scale(s, s);
  ctx.fillStyle = theme.cream;
  ctx.beginPath();
  ctx.ellipse(0, 4, 16, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.lineTo(-16, -16);
  ctx.lineTo(-4, -8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -4);
  ctx.lineTo(16, -16);
  ctx.lineTo(4, -8);
  ctx.fill();
  ctx.fillStyle = theme.seal;
  ctx.beginPath();
  ctx.ellipse(0, 2, 2.4, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(-5, -1, 1.6, 0, Math.PI * 2);
  ctx.arc(5, -1, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 2×2 精灵图，10 FPS 循环眨眼 */
const BLINK_COLS = 2;
const BLINK_ROWS = 2;
const BLINK_FRAMES = BLINK_COLS * BLINK_ROWS;
const BLINK_FPS = 6;

function blinkFrameIndex(): number {
  return Math.floor(Date.now() / (1000 / BLINK_FPS)) % BLINK_FRAMES;
}

function drawBlinkCat(
  ctx: CanvasRenderingContext2DLike,
  cx: number,
  cy: number,
  size: number,
): boolean {
  if (!blinkImg || blinkImg.width <= 0) return false;
  const frame = blinkFrameIndex();
  const fw = blinkImg.width / BLINK_COLS;
  const fh = blinkImg.height / BLINK_ROWS;
  const col = frame % BLINK_COLS;
  const row = Math.floor(frame / BLINK_COLS);
  // 格子 80% 居中，保持帧原始 1:1 比例，不裁切、不加底
  const draw = size * 0.8;
  ctx.drawImage(
    blinkImg,
    col * fw,
    row * fh,
    fw,
    fh,
    cx - draw / 2,
    cy - draw / 2,
    draw,
    draw,
  );
  return true;
}

export function wrapText(
  ctx: CanvasRenderingContext2DLike,
  text: string,
  width: number,
  font: string,
): string[] {
  ctx.font = font;
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    const next = line + ch;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = ch;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function drawMiniStar(
  ctx: CanvasRenderingContext2DLike,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const ax = cx + Math.cos(a) * r;
    const ay = cy + Math.sin(a) * r;
    const b = a + Math.PI / 5;
    const bx = cx + Math.cos(b) * r * 0.42;
    const by = cy + Math.sin(b) * r * 0.42;
    if (i === 0) ctx.moveTo(ax, ay);
    else ctx.lineTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fill();
}

function drawMiniLeaf(
  ctx: CanvasRenderingContext2DLike,
  cx: number,
  cy: number,
  size: number,
): void {
  ctx.fillStyle = theme.starFill;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.55);
  ctx.quadraticCurveTo(cx + size * 0.65, cy - size * 0.1, cx, cy + size * 0.55);
  ctx.quadraticCurveTo(cx - size * 0.65, cy - size * 0.1, cx, cy - size * 0.55);
  ctx.fill();
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.stroke();
}

export function drawHeroPortrait(
  ctx: CanvasRenderingContext2DLike,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.save();
  const ring = Math.max(4, radius * 0.06);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, radius + ring, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d7e8f2";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = ring;
  ctx.stroke();

  if (heroCatImg) {
    // 对齐 H5：猫略大于光圈，底对齐探出爪
    const catSize = radius * 2 * (232 / 214);
    const catTop = cy - radius - radius * 0.055;
    ctx.drawImage(heroCatImg, cx - catSize / 2, catTop, catSize, catSize);
  } else {
    drawCat(ctx, cx, cy + radius * 0.06, (radius * 2.05) / 70);
  }

  // 气泡在光圈下方（与 H5 hello-tag 一致）
  const bubbleW = radius * 1.05;
  const bubbleH = radius * 0.34;
  const bubble: Rect = {
    x: cx - bubbleW / 2,
    y: cy + radius * 0.78,
    w: bubbleW,
    h: bubbleH,
  };
  ctx.save();
  ctx.translate(bubble.x + bubble.w / 2, bubble.y + bubble.h / 2);
  ctx.rotate((-5 * Math.PI) / 180);
  fillRound(
    ctx,
    { x: -bubble.w / 2, y: -bubble.h / 2, w: bubble.w, h: bubble.h },
    theme.surface,
    bubbleH * 0.45,
  );
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 1;
  roundBox(ctx, -bubble.w / 2, -bubble.h / 2, bubble.w, bubble.h, bubbleH * 0.45);
  ctx.stroke();
  ctx.fillStyle = theme.muted;
  ctx.font = `600 ${Math.max(10, radius * 0.14)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("找到我了吗？", 0, 0);
  ctx.restore();

  const bs = radius * 0.28;
  const br = bs * 0.32;
  const blocks: { rect: Rect; color: string; draw: () => void }[] = [
    {
      rect: {
        x: cx - radius * 1.02 - bs / 2,
        y: cy - radius * 0.35 - bs / 2,
        w: bs,
        h: bs,
      },
      color: theme.regions[0]!,
      draw: () => {
        drawMark(ctx, cx - radius * 1.02, cy - radius * 0.35, bs, false);
      },
    },
    {
      rect: {
        x: cx + radius * 0.78 - bs / 2,
        y: cy - radius * 0.55 - bs / 2,
        w: bs,
        h: bs,
      },
      color: "#4ba5ed",
      draw: () => {
        drawMiniStar(ctx, cx + radius * 0.78, cy - radius * 0.55, bs * 0.22, "#ffffff");
      },
    },
    {
      rect: {
        x: cx + radius * 0.88 - bs / 2,
        y: cy + radius * 0.42 - bs / 2,
        w: bs,
        h: bs,
      },
      color: theme.regions[2]!,
      draw: () => {
        drawMiniLeaf(ctx, cx + radius * 0.88, cy + radius * 0.42, bs * 0.55);
      },
    },
  ];

  for (const block of blocks) {
    ctx.save();
    ctx.shadowColor = "rgba(64,83,105,0.15)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    fillRound(ctx, block.rect, block.color, br);
    ctx.restore();
    block.draw();
  }
  ctx.restore();
}

let heroCatImg: CanvasImageSourceLike | null = null;
let heroCatTried = false;
let blinkImg: CanvasImageSourceLike | null = null;
let blinkTried = false;

function makeImage(canvas: HTMLCanvasElementLike): CanvasImageSourceLike | null {
  if (typeof wx.createImage === "function") return wx.createImage();
  if (typeof canvas.createImage === "function") return canvas.createImage();
  return null;
}

function loadDataUrl(
  canvas: HTMLCanvasElementLike,
  src: string,
  fileFallback: string,
  onReady: (img: CanvasImageSourceLike) => void,
): void {
  const img = makeImage(canvas);
  if (!img) return;
  const accept = () => onReady(img);
  img.onload = accept;
  img.onerror = () => {
    const fallback = makeImage(canvas);
    if (!fallback) return;
    fallback.onload = () => onReady(fallback);
    fallback.src = fileFallback;
  };
  img.src = src;
  if (img.width > 0) accept();
}

/** 加载 H5 首页猫图（data URL，不依赖本地路径） */
export function loadHeroCat(canvas: HTMLCanvasElementLike): void {
  if (heroCatTried || heroCatImg) return;
  heroCatTried = true;
  loadDataUrl(canvas, HERO_CAT_SRC, "/images/cat-1024.png", (img) => {
    heroCatImg = img;
  });
}

/** 加载棋盘猫眨眼精灵图（4 帧） */
export function loadCatBlink(canvas: HTMLCanvasElementLike): void {
  if (blinkTried || blinkImg) return;
  blinkTried = true;
  loadDataUrl(canvas, CAT_BLINK_SRC, "/assets/cats/cat-blink.png", (img) => {
    blinkImg = img;
  });
}

export function card(ctx: CanvasRenderingContext2DLike, rect: Rect, radius = 22): void {
  ctx.shadowColor = "rgba(64,83,105,0.12)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  fillRound(ctx, rect, theme.surface, radius);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}
