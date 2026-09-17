export const theme = {
  paper: "#f3ead8",
  paperDeep: "#e4d3b8",
  cream: "#fff8ee",
  ink: "#2c211c",
  mute: "#8a7063",
  seal: "#d4522a",
  sealDark: "#b33d1c",
  cocoa: "#6b4a34",
  moss: "#4f6d57",
  line: "#d7c4aa",
  wrong: "#c43c28",
  regions: [
    "#e8b4a2",
    "#ead58a",
    "#a8c5b8",
    "#d9c4a8",
    "#9bb7d0",
    "#c9a27a",
    "#d4b8c8",
    "#b5c98a",
    "#e2c08d",
  ],
};

export const difficultyName = {
  easy: "轻松",
  normal: "标准",
  hard: "困难",
  expert: "专家",
} as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function hit(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
}

export function roundBox(
  ctx: CanvasRenderingContext2DLike,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function fillRound(
  ctx: CanvasRenderingContext2DLike,
  rect: Rect,
  color: string,
  r: number,
): void {
  ctx.fillStyle = color;
  roundBox(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.fill();
}

export function strokeRound(
  ctx: CanvasRenderingContext2DLike,
  rect: Rect,
  color: string,
  r: number,
  width = 1.5,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  roundBox(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.stroke();
}
