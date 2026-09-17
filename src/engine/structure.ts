import type { Level } from "../types";

export function fourNeighbors(n: number, index: number): number[] {
  const r = Math.floor(index / n);
  const c = index % n;
  const out: number[] = [];
  if (r > 0) out.push(index - n);
  if (r + 1 < n) out.push(index + n);
  if (c > 0) out.push(index - 1);
  if (c + 1 < n) out.push(index + 1);
  return out;
}

function connected(n: number, cells: number[]): boolean {
  if (!cells.length) return false;
  const want = new Set(cells);
  const seen = new Set<number>([cells[0]]);
  const queue = [cells[0]];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const next of fourNeighbors(n, cur)) {
      if (want.has(next) && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.size === cells.length;
}

export function validSolution(level: Level, solution = level.solution): boolean {
  const n = level.size;
  if (solution.length !== n) return false;
  const rows = new Set<number>();
  const cols = new Set<number>();
  const regions = new Set<number>();
  for (const p of solution) {
    if (p.row < 0 || p.col < 0 || p.row >= n || p.col >= n) return false;
    rows.add(p.row);
    cols.add(p.col);
    regions.add(level.regions[p.row][p.col]);
  }
  if (rows.size !== n || cols.size !== n || regions.size !== n) return false;
  for (let i = 0; i < solution.length; i++) {
    for (let j = i + 1; j < solution.length; j++) {
      if (
        Math.abs(solution[i].row - solution[j].row) <= 1 &&
        Math.abs(solution[i].col - solution[j].col) <= 1
      ) {
        return false;
      }
    }
  }
  return true;
}

export function validRegions(level: Level): boolean {
  const n = level.size;
  if (n < 4 || !level.regions || level.regions.length !== n) return false;
  const counts = Array(n).fill(0);
  for (let r = 0; r < n; r++) {
    if (level.regions[r]?.length !== n) return false;
    for (let c = 0; c < n; c++) {
      const id = level.regions[r][c];
      if (!Number.isInteger(id) || id < 0 || id >= n) return false;
      counts[id]++;
    }
  }
  if (counts.some((count) => count === 0)) return false;
  for (let id = 0; id < n; id++) {
    const cells: number[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (level.regions[r][c] === id) cells.push(r * n + c);
      }
    }
    if (!connected(n, cells)) return false;
  }
  return true;
}

export function validStructure(level: Level): boolean {
  return validRegions(level) && validSolution(level);
}
