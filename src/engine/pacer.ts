import type { Purpose } from "../types";
import type { Rng } from "./rng";

export interface PaceHistory {
  score: number;
  purpose: Purpose;
  size: number;
  signature: string;
}

export interface LevelPlan {
  ordinal: number;
  size: number;
  purpose: Purpose;
  scoreMin: number;
  scoreMax: number;
  combinations: boolean;
  easyGeometry: boolean;
  hardCap: number;
  teaching: boolean;
  adapt: boolean;
  maxF: number;
  maxR: number;
}

interface Band {
  from: number;
  to: number;
  normal: [number, number];
  challenge: [number, number] | null;
  relax: [number, number] | null;
  sizes: [number, number][];
}

const bands: Band[] = [
  { from: 1, to: 5, normal: [0, 18], challenge: null, relax: null, sizes: [[6, 1]] },
  { from: 6, to: 10, normal: [10, 30], challenge: null, relax: null, sizes: [[6, 1]] },
  { from: 11, to: 20, normal: [18, 30], challenge: [30, 40], relax: [10, 17], sizes: [[6, 0.6], [7, 0.4]] },
  { from: 21, to: 40, normal: [25, 38], challenge: [38, 48], relax: [15, 24], sizes: [[7, 1]] },
  { from: 41, to: 70, normal: [30, 44], challenge: [44, 55], relax: [20, 29], sizes: [[7, 0.7], [8, 0.3]] },
  { from: 71, to: 100, normal: [35, 50], challenge: [50, 62], relax: [22, 34], sizes: [[8, 1]] },
  { from: 101, to: 150, normal: [38, 55], challenge: [55, 68], relax: [24, 37], sizes: [[8, 0.85], [9, 0.15]] },
  { from: 151, to: 200, normal: [40, 58], challenge: [58, 72], relax: [25, 39], sizes: [[8, 0.7], [9, 0.3]] },
  { from: 201, to: 1e9, normal: [35, 64], challenge: [60, 78], relax: [20, 34], sizes: [[8, 0.75], [9, 0.25]] },
];

function bandFor(ordinal: number): Band {
  return bands.find((b) => ordinal >= b.from && ordinal <= b.to) ?? bands[bands.length - 1];
}

function pickWeighted(pairs: [number, number][], rng: Rng): number {
  const hit = rng.weighted(pairs.map(([value, w]) => ({ value, w })));
  return hit?.value ?? pairs[0][0];
}

function purposeOdds(ordinal: number): { purpose: Purpose; w: number }[] {
  if (ordinal <= 10) return [{ purpose: "normal", w: 1 }];
  if (ordinal <= 100) {
    return [
      { purpose: "normal", w: 0.7 },
      { purpose: "challenge", w: 0.2 },
      { purpose: "relax", w: 0.1 },
    ];
  }
  if (ordinal <= 200) {
    return [
      { purpose: "normal", w: 0.65 },
      { purpose: "challenge", w: 0.2 },
      { purpose: "relax", w: 0.15 },
    ];
  }
  return [
    { purpose: "normal", w: 0.6 },
    { purpose: "challenge", w: 0.25 },
    { purpose: "relax", w: 0.15 },
  ];
}

function relaxSizes(ordinal: number): [number, number][] {
  if (ordinal <= 40) return [[6, 0.7], [7, 0.3]];
  if (ordinal <= 100) return [[7, 0.7], [8, 0.3]];
  return [[7, 0.2], [8, 0.8]];
}

export function planLevel(
  ordinal: number,
  history: PaceHistory[],
  sizeCounts: Record<number, number>,
  rng: Rng,
): LevelPlan {
  const band = bandFor(ordinal);
  let purpose = rng.weighted(purposeOdds(ordinal))!.purpose;
  if (purpose === "challenge" && !band.challenge) purpose = "normal";
  if (purpose === "relax" && !band.relax) purpose = "normal";

  const recent = history.slice(-20);
  const last3 = recent.slice(-3);
  const last4 = recent.slice(-4);
  let hardCap = 78;
  let forceRelax = false;
  if (last3.length === 3 && last3.every((h) => h.score >= 60)) {
    forceRelax = true;
    hardCap = Math.min(hardCap, 34);
  }
  if (last4.filter((h) => h.score >= 65).length >= 2) {
    hardCap = Math.min(hardCap, 59);
    if (purpose === "challenge") purpose = "normal";
  }
  if (recent.at(-1)?.purpose === "relax" && purpose === "relax" && !forceRelax) {
    purpose = "normal";
  }
  if (recent.slice(-2).every((h) => h.size === 9) && purpose !== "relax") {
    // size filter later
  }
  if (ordinal > 20 && last3.length === 3 && last3.every((h) => h.score <= 30) && purpose === "relax") {
    purpose = "normal";
  }
  if (forceRelax) purpose = "relax";

  const window =
    purpose === "challenge" && band.challenge
      ? band.challenge
      : purpose === "relax" && band.relax
        ? band.relax
        : band.normal;

  let sizeWeights =
    purpose === "relax"
      ? relaxSizes(ordinal)
      : ordinal >= 201 && purpose === "challenge"
        ? ([[8, 0.6], [9, 0.4]] as [number, number][])
        : band.sizes;

  if (recent.slice(-2).every((h) => h.size === 9)) {
    sizeWeights = sizeWeights.filter(([size]) => size !== 9);
    if (!sizeWeights.length) sizeWeights = [[8, 1]];
  }

  const known = new Set(
    Object.entries(sizeCounts)
      .filter(([, count]) => count > 0)
      .map(([size]) => Number(size)),
  );
  if (known.size) {
    const intro = sizeWeights.filter(([size]) => size === 6 || known.has(size) || size === Math.min(...sizeWeights.map((s) => s[0])));
    // allow first new size when the band includes it and smaller sizes already seen
    const candidateNew = sizeWeights.map(([s]) => s).filter((s) => !known.has(s));
    const unlocked = candidateNew.filter((s) => known.has(s - 1) || s === 6);
    sizeWeights = sizeWeights.filter(([s]) => known.has(s) || unlocked.includes(s) || s === 6);
    if (!sizeWeights.length) sizeWeights = intro.length ? intro : [[6, 1]];
  }

  let size = pickWeighted(sizeWeights, rng);
  const seenSize = sizeCounts[size] ?? 0;
  const adapt = (size > 6 && seenSize < 2) || (size === 7 && !known.has(7) && seenSize < 2);
  let scoreMin = window[0];
  let scoreMax = Math.min(window[1], hardCap);
  if (adapt) {
    purpose = "normal";
    scoreMin = band.normal[0];
    scoreMax = Math.min(band.normal[1], 50, hardCap);
  }
  if (ordinal > 20 && last3.length === 3 && last3.every((h) => h.score <= 30) && purpose === "normal") {
    scoreMin = Math.max(scoreMin, band.normal[0] + 4);
  }

  const teaching = ordinal <= 10;
  const combinations = !teaching;
  return {
    ordinal,
    size,
    purpose,
    scoreMin,
    scoreMax: Math.max(scoreMin, scoreMax),
    combinations,
    easyGeometry: teaching || purpose === "relax" || ordinal <= 10,
    hardCap,
    teaching,
    adapt,
    maxF: ordinal <= 5 ? 1 : ordinal <= 10 ? 3 : 10,
    maxR: ordinal <= 5 ? 2 : ordinal <= 10 ? 4 : 10,
  };
}
