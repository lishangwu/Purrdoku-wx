export const LAST_CAT_HOLD_MS = 650;
export const CELEBRATION_MS = 850;
export const COMPLETE_SEQUENCE_MS = 1_850;
export const BOARD_PULSE_MS = 420;

export type ConfettiShape = "dot" | "star" | "paw";

export interface ConfettiParticle {
  x: number;
  y: number;
  drift: number;
  fall: number;
  size: number;
  spin: number;
  phase: number;
  color: string;
  shape: ConfettiShape;
}

const colors = ["#f3b6c6", "#f4cf69", "#8fc9bd", "#a99bd8", "#f09b72"];
const shapes: ConfettiShape[] = ["dot", "star", "paw"];

/** Small deterministic burst: stable across redraws and cheap on mini-game canvases. */
export function createConfetti(count = 24): ConfettiParticle[] {
  let seed = 0x51f15e;
  const random = () => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  return Array.from({ length: count }, (_, index) => ({
    x: 0.04 + random() * 0.92,
    y: -0.04 - random() * 0.32,
    drift: (random() - 0.5) * 46,
    fall: 0.7 + random() * 0.45,
    size: 3 + random() * 3,
    spin: (random() - 0.5) * 8,
    phase: random() * Math.PI * 2,
    color: colors[index % colors.length]!,
    shape: shapes[index % shapes.length]!,
  }));
}

export function celebrationElapsed(sequenceElapsedMs: number): number {
  return Math.max(0, sequenceElapsedMs - LAST_CAT_HOLD_MS);
}

export function boardSuccessScale(sequenceElapsedMs: number): number {
  const elapsed = celebrationElapsed(sequenceElapsedMs);
  if (sequenceElapsedMs < LAST_CAT_HOLD_MS || elapsed >= BOARD_PULSE_MS) return 1;
  return 1 + Math.sin((elapsed / BOARD_PULSE_MS) * Math.PI) * 0.02;
}
