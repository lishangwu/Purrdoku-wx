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
