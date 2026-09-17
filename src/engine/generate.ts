import type { Level } from "../types";
import { ratePuzzle, withinHardCaps } from "./difficulty";
import { logicalSolve } from "./logic";
import { type Rng, rngFrom } from "./rng";
import { shapeOk } from "./quality";
import { countSolutions } from "./search";
import { puzzleSignature } from "./signature";
import { fourNeighbors, validRegions, validSolution } from "./structure";

export interface GenerateRequest {
  seed: string;
  size: number;
  scoreMin: number;
  scoreMax: number;
  combinations: boolean;
  easyGeometry: boolean;
  hardCap?: number;
  maxF?: number;
  maxR?: number;
  maxCandidates?: number;
  recentSignatures?: string[];
}

function placeQueens(n: number, rng: Rng): { row: number; col: number }[] | null {
  const cols: number[] = Array(n).fill(-1);
  const used = new Set<number>();
  const rec = (row: number): boolean => {
    if (row === n) return true;
    for (const col of rng.shuffle([...Array(n).keys()])) {
      if (used.has(col)) continue;
      if (row > 0 && Math.abs(col - cols[row - 1]) <= 1) continue;
      used.add(col);
      cols[row] = col;
      if (rec(row + 1)) return true;
      used.delete(col);
    }
    return false;
  };
  return rec(0) ? cols.map((col, row) => ({ row, col })) : null;
}

function growRegions(
  n: number,
  queens: { row: number; col: number }[],
  rng: Rng,
): number[][] | null {
  const regions = Array.from({ length: n }, () => Array(n).fill(-1));
  const area = Array(n).fill(0);
  queens.forEach((q, i) => {
    regions[q.row][q.col] = i;
    area[i] = 1;
  });
  const leftover = n * n - n;
  for (let step = 0; step < leftover; step++) {
    const options: { r: number; c: number; id: number; w: number }[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (regions[r][c] !== -1) continue;
        const seen = new Set<number>();
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
          const id = regions[rr][cc];
          if (id < 0 || seen.has(id)) continue;
          seen.add(id);
          let edges = 0;
          for (const [er, ec] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const xr = r + er;
            const xc = c + ec;
            if (xr >= 0 && xc >= 0 && xr < n && xc < n && regions[xr][xc] === id) {
              edges += 1;
            }
          }
          options.push({
            r,
            c,
            id,
            w: (1 + edges * 0.7) / (1 + area[id] * 0.07),
          });
        }
      }
    }
    const pick = rng.weighted(options);
    if (!pick) return null;
    regions[pick.r][pick.c] = pick.id;
    area[pick.id] += 1;
  }
  return regions;
}

function relabel(regions: number[][], rng: Rng): number[][] {
  const n = regions.length;
  const perm = rng.shuffle([...Array(n).keys()]);
  return regions.map((row) => row.map((id) => perm[id]));
}

function sameSolution(
  a: { row: number; col: number }[],
  b: { row: number; col: number }[],
): boolean {
  return a.every((p, i) => p.row === b[i].row && p.col === b[i].col);
}

function repairUnique(level: Level, rng: Rng): boolean {
  const n = level.size;
  const official = new Set(level.solution.map((p) => p.row * n + p.col));
  for (let attempt = 0; attempt < 24; attempt++) {
    const found = countSolutions(level, 2, 2_000);
    if (found.status === "complete" && found.solutions.length === 1) return true;
    const extra = found.solutions.find((sol) => !sameSolution(sol, level.solution));
    if (!extra) return false;
    const cells = rng.shuffle(
      extra.filter((p) => !official.has(p.row * n + p.col)),
    );
    let changed = false;
    for (const p of cells) {
      const index = p.row * n + p.col;
      const current = level.regions[p.row][p.col];
      const neighborIds = [
        ...new Set(
          fourNeighbors(n, index)
            .map((i) => level.regions[Math.floor(i / n)][i % n])
            .filter((id) => id !== current),
        ),
      ];
      for (const nid of rng.shuffle(neighborIds)) {
        level.regions[p.row][p.col] = nid;
        if (validRegions(level) && validSolution(level)) {
          changed = true;
          break;
        }
        level.regions[p.row][p.col] = current;
      }
      if (changed) break;
    }
    if (!changed) return false;
  }
  const found = countSolutions(level, 2, 20_000);
  return found.status === "complete" && found.solutions.length === 1;
}

export function generatePuzzle(request: GenerateRequest): Level | null {
  const maxCandidates = request.maxCandidates ?? 800;
  const hardCap = request.hardCap ?? 78;
  const recent = new Set(request.recentSignatures ?? []);
  for (let i = 0; i < maxCandidates; i++) {
    const rng = rngFrom(`${request.seed}|${i}`);
    const queens = placeQueens(request.size, rng);
    if (!queens) continue;
    const grown = growRegions(request.size, queens, rng);
    if (!grown) continue;
    const regions = relabel(grown, rng);
    const level: Level = {
      id: `${request.seed}|${i}`,
      size: request.size,
      regions,
      solution: queens,
      difficulty: "easy",
      seed: request.seed,
      source: "generated",
    };
    if (!validRegions(level) || !validSolution(level)) continue;
    if (!repairUnique(level, rng)) continue;
    const unique = countSolutions(level, 2, 20_000);
    if (unique.status !== "complete" || unique.solutions.length !== 1) continue;
    if (!sameSolution(unique.solutions[0], level.solution)) continue;
    const logic = logicalSolve(level, request.combinations, 200_000);
    if (logic.status !== "solved") continue;
    if (!shapeOk(level, request.easyGeometry)) continue;
    const rating = ratePuzzle(level, request.combinations);
    if (!rating) continue;
    if (rating.score < request.scoreMin || rating.score > request.scoreMax) continue;
    if (rating.score > hardCap) continue;
    if (
      !withinHardCaps(
        { size: request.size, F: rating.F, R: rating.R, C: rating.C, D: rating.D },
        {
          teaching: !request.combinations,
          easy: request.easyGeometry,
          maxF: request.maxF ?? 10,
          maxR: request.maxR ?? 10,
        },
      )
    ) {
      continue;
    }
    const signature = puzzleSignature(level.regions);
    if (recent.has(signature)) continue;
    level.rating = rating;
    level.difficulty = rating.band;
    level.signature = signature;
    return level;
  }
  return null;
}
