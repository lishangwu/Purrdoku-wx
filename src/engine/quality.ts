import type { Level } from "../types";

function areaCells(level: Level, id: number): number[] {
  const n = level.size;
  const cells: number[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (level.regions[r][c] === id) cells.push(r * n + c);
    }
  }
  return cells;
}

function perimeter(n: number, cells: Set<number>): number {
  let edge = 0;
  for (const i of cells) {
    const r = Math.floor(i / n);
    const c = i % n;
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n || !cells.has(rr * n + cc)) {
        edge += 1;
      }
    }
  }
  return edge;
}

function concaveCorners(n: number, cells: Set<number>): number {
  let count = 0;
  for (let r = 0; r <= n; r++) {
    for (let c = 0; c <= n; c++) {
      const quad = [
        r > 0 && c > 0 ? (r - 1) * n + (c - 1) : -1,
        r > 0 && c < n ? (r - 1) * n + c : -1,
        r < n && c > 0 ? r * n + (c - 1) : -1,
        r < n && c < n ? r * n + c : -1,
      ];
      const inside = quad.filter((i) => i >= 0 && cells.has(i)).length;
      if (inside === 3) count += 1;
    }
  }
  return count;
}

function longestCorridor(n: number, cells: Set<number>): number {
  let best = 0;
  const inRegion = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < n && c < n && cells.has(r * n + c);
  for (const i of cells) {
    const r = Math.floor(i / n);
    const c = i % n;
    const verticalNeighbors = inRegion(r, c - 1) || inRegion(r, c + 1);
    const horizontalNeighbors = inRegion(r - 1, c) || inRegion(r + 1, c);
    if (!verticalNeighbors) {
      let len = 1;
      let rr = r + 1;
      while (inRegion(rr, c) && !inRegion(rr, c - 1) && !inRegion(rr, c + 1)) {
        len += 1;
        rr += 1;
      }
      best = Math.max(best, len);
    }
    if (!horizontalNeighbors) {
      let len = 1;
      let cc = c + 1;
      while (inRegion(r, cc) && !inRegion(r - 1, cc) && !inRegion(r + 1, cc)) {
        len += 1;
        cc += 1;
      }
      best = Math.max(best, len);
    }
  }
  return best;
}

export function shapeOk(level: Level, easy: boolean): boolean {
  const n = level.size;
  let singletons = 0;
  for (let id = 0; id < n; id++) {
    const list = areaCells(level, id);
    const set = new Set(list);
    if (list.length === 1) singletons += 1;
    if (list.length > 3 * n) return false;
    if (longestCorridor(n, set) > (easy ? 4 : 5)) return false;
    if (concaveCorners(n, set) > (easy ? 7 : 9)) return false;
    const ratio = perimeter(n, set) / (4 * Math.sqrt(list.length));
    if (ratio > (easy ? 1.85 : 2)) return false;
  }
  if (easy && singletons > 1) return false;
  if (!easy && singletons > 0) return false;
  return true;
}
