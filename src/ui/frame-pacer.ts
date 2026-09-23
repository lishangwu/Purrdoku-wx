export const FRAME_INTERVAL_MS = 1000 / 30;

export function shouldRenderFrame(timestamp: number, lastFrame: number): boolean {
  return lastFrame === 0 || timestamp - lastFrame >= FRAME_INTERVAL_MS - 0.5;
}
