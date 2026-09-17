import type { Difficulty, Level, Rating } from "../types";
import { logicalSolve, type LogicResult } from "./logic";

export interface Metrics {
  size: number;
  F: number;
  R: number;
  C: number;
  D: number;
}

function interp(x: number, points: [number, number][]): number {
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return last[1];
}

export function semanticFloor(m: Pick<Metrics, "F" | "R" | "C">): number {
  let floor = 0;
  if (m.C >= 1 || m.F >= 3 || m.R >= 4) floor = Math.max(floor, 25);
  if (m.C >= 2 || m.F >= 5 || m.R >= 5) floor = Math.max(floor, 45);
  if (m.C >= 3) floor = Math.max(floor, 65);
  return floor;
}

export function scoreBand(score: number): Difficulty {
  if (score <= 24) return "easy";
  if (score <= 44) return "normal";
  if (score <= 64) return "hard";
  return "expert";
}

export function rateFromMetrics(m: Metrics): Rating {
  const B = Math.min(1, Math.max(0, (m.size - 6) / 3));
  const W = Math.max(0, m.D - m.F - m.R) / m.size;
  const weighted = Math.round(
    10 * B +
      25 * interp(m.F, [
        [0, 0],
        [1, 0.15],
        [2, 0.3],
        [4, 0.6],
        [6, 0.85],
        [8, 1],
      ]) +
      20 * interp(m.R, [
        [0, 0],
        [1, 0.2],
        [2, 0.35],
        [4, 0.65],
        [6, 0.85],
        [8, 1],
      ]) +
      30 * interp(m.C, [
        [0, 0],
        [1, 0.35],
        [2, 0.6],
        [3, 0.8],
        [4, 1],
      ]) +
      15 * interp(W, [
        [0, 0],
        [0.5, 0.35],
        [1, 0.7],
        [1.5, 1],
      ]),
  );
  const score = Math.min(100, Math.max(semanticFloor(m), weighted));
  return { score, band: scoreBand(score), B, F: m.F, R: m.R, C: m.C, D: m.D, W };
}

export function metricsFromTrace(size: number, trace: LogicResult): Metrics {
  let F = 0;
  let R = 0;
  let chain = 0;
  let C = 0;
  let D = 0;
  let seenCat = false;
  for (const step of trace.steps) {
    const effective =
      step.removed.length > 0 && step.rule !== "B1" && step.rule !== "B2";
    if (step.rule === "B1" && step.placed.length) {
      if (!seenCat) {
        seenCat = true;
      } else {
        R = Math.max(R, chain);
      }
      chain = 0;
    }
    if (!effective) continue;
    D += 1;
    if (step.rule === "C1") C += 1;
    if (!seenCat) F += 1;
    else chain += 1;
  }
  R = Math.max(R, chain);
  return { size, F, R, C, D };
}

export function ratePuzzle(level: Level, combinations = true): Rating | null {
  const trace = logicalSolve(level, combinations, 200_000);
  if (trace.status !== "solved") return null;
  return rateFromMetrics(metricsFromTrace(level.size, trace));
}

export function withinHardCaps(
  m: Metrics,
  opts: { teaching?: boolean; easy?: boolean; maxF?: number; maxR?: number } = {},
): boolean {
  if (m.F > (opts.maxF ?? 10) || m.R > (opts.maxR ?? 10) || m.C > 6) return false;
  const small = m.size <= 7;
  if (small && (opts.easy || opts.teaching) && m.D > 12) return false;
  if (small && !opts.easy && !opts.teaching && m.D > 20) return false;
  if (!small && m.D > 30) return false;
  if (opts.teaching && m.C > 0) return false;
  return true;
}
