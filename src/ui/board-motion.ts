export type BoardMotionKind = "mark-in" | "mark-out" | "cat-in" | "wrong";

export interface BoardMotionSample {
  alive: boolean;
  opacity: number;
  scale: number;
  shakeX: number;
}

const durations: Record<BoardMotionKind, number> = {
  "mark-in": 130,
  "mark-out": 130,
  "cat-in": 280,
  wrong: 200,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function sampleBoardMotion(kind: BoardMotionKind, elapsedMs: number): BoardMotionSample {
  const progress = clamp01(elapsedMs / durations[kind]);
  if (kind === "mark-in") {
    return { alive: progress < 1, opacity: progress, scale: 0.65 + 0.35 * progress, shakeX: 0 };
  }
  if (kind === "mark-out") {
    return { alive: progress < 1, opacity: 1 - progress, scale: 1 - 0.35 * progress, shakeX: 0 };
  }
  if (kind === "cat-in") {
    if (progress >= 1) return { alive: false, opacity: 1, scale: 1, shakeX: 0 };
    const scale = progress < 0.7
      ? 1.13 * (progress / 0.7)
      : 1.13 - 0.13 * ((progress - 0.7) / 0.3);
    return { alive: progress < 1, opacity: 1, scale, shakeX: 0 };
  }
  const keyframes = [0, -4, 4, -2, 2, 0];
  const position = progress * (keyframes.length - 1);
  const from = Math.min(keyframes.length - 2, Math.floor(position));
  const mix = position - from;
  const shakeX = keyframes[from]! + (keyframes[from + 1]! - keyframes[from]!) * mix;
  return { alive: progress < 1, opacity: 1, scale: 1, shakeX };
}

export function regionFlashAmount(elapsedMs: number): number {
  const progress = clamp01(elapsedMs / 450);
  return progress >= 1 ? 0 : Math.sin(progress * Math.PI) * 0.16;
}

export const CAT_IDLE_FRAME_COUNT = 8;
export const CAT_IDLE_FRAME_MS = 45;
export const CAT_IDLE_CYCLE_MS = CAT_IDLE_FRAME_COUNT * CAT_IDLE_FRAME_MS;

export function catIdleFrame(timeMs: number, cellIndex: number, active: boolean): number {
  if (!active) return 0;
  const phase = (timeMs + cellIndex * 431) % 6000;
  if (phase < 2700 || phase >= 2700 + CAT_IDLE_CYCLE_MS) return 0;
  return Math.min(
    CAT_IDLE_FRAME_COUNT - 1,
    Math.floor((phase - 2700) / CAT_IDLE_FRAME_MS),
  );
}
