import { fillRound, roundBox, theme, type Rect } from "./theme";

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
  ctx.strokeStyle = wrong ? theme.wrong : theme.muted;
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
): void {
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

  drawCat(ctx, cx, cy + radius * 0.06, (radius * 2.05) / 70);

  const bubbleW = radius * 1.05;
  const bubbleH = radius * 0.38;
  const bubble: Rect = {
    x: cx + radius * 0.22,
    y: cy - radius * 1.05,
    w: bubbleW,
    h: bubbleH,
  };
  fillRound(ctx, bubble, theme.surface, bubbleH * 0.35);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1;
  roundBox(ctx, bubble.x, bubble.y, bubble.w, bubble.h, bubbleH * 0.35);
  ctx.stroke();
  ctx.fillStyle = theme.ink;
  ctx.font = `600 ${Math.max(11, radius * 0.16)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("找到我了吗？", bubble.x + bubble.w / 2, bubble.y + bubble.h / 2);

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
        y: cy + radius * 0.42 - bs / 2,
        w: bs,
        h: bs,
      },
      color: theme.regions[2]!,
      draw: () => {
        drawMiniStar(ctx, cx + radius * 0.78, cy + radius * 0.42, bs * 0.22, "#ffffff");
      },
    },
    {
      rect: {
        x: cx - radius * 0.92 - bs / 2,
        y: cy + radius * 0.62 - bs / 2,
        w: bs,
        h: bs,
      },
      color: theme.regions[1]!,
      draw: () => {
        drawMiniLeaf(ctx, cx - radius * 0.92, cy + radius * 0.62, bs * 0.55);
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
