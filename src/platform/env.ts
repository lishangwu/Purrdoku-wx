export interface Env {
  canvas: HTMLCanvasElementLike;
  ctx: CanvasRenderingContext2DLike;
  width: number;
  height: number;
  pixelRatio: number;
  insetTop: number;
  insetBottom: number;
}

export function createEnv(): Env {
  const canvas = wx.createCanvas();
  const env: Env = {
    canvas,
    ctx: canvas.getContext("2d"),
    width: 375,
    height: 667,
    pixelRatio: 2,
    insetTop: 24,
    insetBottom: 0,
  };
  fit(env);
  return env;
}

export function fit(env: Env): void {
  const info = wx.getWindowInfo?.() ?? wx.getSystemInfoSync();
  env.width = info.windowWidth;
  env.height = info.windowHeight;
  env.pixelRatio = info.pixelRatio || 1;
  env.insetTop = info.safeArea?.top || info.statusBarHeight || 24;
  env.insetBottom = Math.max(
    0,
    info.windowHeight - (info.safeArea?.bottom || info.windowHeight),
  );
  env.canvas.width = Math.round(env.width * env.pixelRatio);
  env.canvas.height = Math.round(env.height * env.pixelRatio);
  env.ctx.scale(env.pixelRatio, env.pixelRatio);
}
