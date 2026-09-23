/** 微信小游戏运行环境声明 */

declare interface WxTouch {
  identifier: number;
  clientX: number;
  clientY: number;
}

declare interface WxTouchEvent {
  touches: WxTouch[];
  changedTouches: WxTouch[];
}

declare interface WxSystemInfo {
  windowWidth: number;
  windowHeight: number;
  pixelRatio: number;
  statusBarHeight?: number;
  safeArea?: { top: number; bottom: number; left: number; right: number };
  platform?: string;
}

declare interface CanvasGradientLike {
  addColorStop(offset: number, color: string): void;
}

declare interface TextMetricsLike {
  width: number;
}

declare interface CanvasRenderingContext2DLike {
  fillStyle: string | CanvasGradientLike;
  strokeStyle: string | CanvasGradientLike;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  globalAlpha: number;
  font: string;
  textAlign: "left" | "center" | "right";
  textBaseline: "top" | "middle" | "bottom" | "alphabetic";
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean): void;
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, a0: number, a1: number, ccw?: boolean): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void;
  rect(x: number, y: number, w: number, h: number): void;
  fill(): void;
  stroke(): void;
  clip(): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  rotate(a: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  strokeText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): TextMetricsLike;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradientLike;
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradientLike;
  setLineDash?(segments: number[]): void;
  drawImage(
    image: CanvasImageSourceLike,
    dx: number,
    dy: number,
    dw?: number,
    dh?: number,
  ): void;
  drawImage(
    image: CanvasImageSourceLike,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}

declare interface CanvasImageSourceLike {
  width: number;
  height: number;
  src: string;
  onload: ((ev?: unknown) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
}

declare interface HTMLCanvasElementLike {
  width: number;
  height: number;
  getContext(type: "2d"): CanvasRenderingContext2DLike;
  createImage?(): CanvasImageSourceLike;
}

declare interface WxAudioParamLike {
  value: number;
  setValueAtTime(value: number, time: number): void;
  linearRampToValueAtTime(value: number, time: number): void;
  exponentialRampToValueAtTime(value: number, time: number): void;
}

declare interface WxAudioNodeLike {
  connect(target: WxAudioNodeLike): void;
}

declare interface WxOscillatorLike extends WxAudioNodeLike {
  type: string;
  frequency: WxAudioParamLike;
  start(time: number): void;
  stop(time: number): void;
}

declare interface WxGainLike extends WxAudioNodeLike {
  gain: WxAudioParamLike;
}

declare interface WxAudioContextLike {
  currentTime: number;
  destination: WxAudioNodeLike;
  createOscillator(): WxOscillatorLike;
  createGain(): WxGainLike;
  resume?(): void;
}

declare const wx: {
  createCanvas(): HTMLCanvasElementLike;
  createImage?(): CanvasImageSourceLike;
  getSystemInfoSync(): WxSystemInfo;
  getWindowInfo?(): WxSystemInfo;
  onWindowResize?(cb: (res: { windowWidth: number; windowHeight: number }) => void): void;
  onTouchStart(cb: (e: WxTouchEvent) => void): void;
  onTouchMove(cb: (e: WxTouchEvent) => void): void;
  onTouchEnd(cb: (e: WxTouchEvent) => void): void;
  onTouchCancel(cb: (e: WxTouchEvent) => void): void;
  onKeyDown?(cb: (e: { code: string; key?: string }) => void): void;
  vibrateShort?(opts: { type?: string }): void;
  createWebAudioContext?(): WxAudioContextLike;
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  onShow(cb: () => void): void;
  onHide(cb: () => void): void;
};

declare function requestAnimationFrame(cb: (ts: number) => void): number;
declare function setTimeout(fn: () => void, ms?: number): number;
declare function clearTimeout(id: number): void;
