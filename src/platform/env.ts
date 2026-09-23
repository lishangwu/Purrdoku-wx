export interface Env {
  canvas: HTMLCanvasElementLike;
  ctx: CanvasRenderingContext2DLike;
  width: number;
  height: number;
  pixelRatio: number;
  insetTop: number;
  insetBottom: number;
}

export interface WindowMetrics {
  width: number;
  height: number;
  pixelRatio: number;
  insetTop: number;
  insetBottom: number;
}

export function windowMetrics(info: WxSystemInfo): WindowMetrics {
  return {
    width: Math.max(1, info.windowWidth),
    height: Math.max(1, info.windowHeight),
    pixelRatio: Math.max(1, info.pixelRatio || 1),
    insetTop: Math.max(0, info.safeArea?.top ?? info.statusBarHeight ?? 24),
    insetBottom: Math.max(0, info.windowHeight - (info.safeArea?.bottom ?? info.windowHeight)),
  };
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
  const metrics = windowMetrics(info);
  env.width = metrics.width;
  env.height = metrics.height;
  env.pixelRatio = metrics.pixelRatio;
  env.insetTop = metrics.insetTop;
  env.insetBottom = metrics.insetBottom;
  env.canvas.width = Math.round(env.width * env.pixelRatio);
  env.canvas.height = Math.round(env.height * env.pixelRatio);
  env.ctx.scale(env.pixelRatio, env.pixelRatio);
}
