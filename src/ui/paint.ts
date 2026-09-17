import { fillRound, roundBox, theme, type Rect } from "./theme";

export function paintPaper(
  ctx: CanvasRenderingContext2DLike,
  w: number,
  h: number,
): void {
  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(255,248,238,0.55)");
  grad.addColorStop(0.45, "rgba(243,234,216,0)");
  grad.addColorStop(1, "rgba(196,156,110,0.18)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(90,62,44,0.045)";
  for (let i = 0; i < 90; i++) {
    const x = ((i * 97) % 87) / 87 * w;
    const y = ((i * 53) % 79) / 79 * h;
    ctx.beginPath();
    ctx.arc(x, y, i % 5 === 0 ? 1.4 : 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
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
  ctx.fillStyle = on ? theme.seal : theme.line;
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
  ctx.strokeStyle = wrong ? theme.wrong : theme.cocoa;
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

export function card(ctx: CanvasRenderingContext2DLike, rect: Rect, radius = 22): void {
  ctx.shadowColor = "rgba(80,52,32,0.14)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  fillRound(ctx, rect, theme.cream, radius);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(80,52,32,0.08)";
  ctx.lineWidth = 1;
  roundBox(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.stroke();
}
