import type { Level, Position } from "../types";
import { validRegions } from "./structure";

export type SearchStatus = "complete" | "limit" | "budget" | "invalid";

export interface SearchResult {
  status: SearchStatus;
  solutions: Position[][];
  nodes: number;
}

export function countSolutions(
  level: Level,
  limit = 2,
  budget = 20_000,
): SearchResult {
  const result: SearchResult = { status: "complete", solutions: [], nodes: 0 };
  if (!validRegions(level)) {
    result.status = "invalid";
    return result;
  }
  const n = level.size;
  const flat = level.regions.flat();
  const usedCol = Array(n).fill(false);
  const usedRegion = Array(n).fill(false);
  const cols: number[] = Array(n).fill(-1);

  const search = (row: number): boolean => {
    if (result.nodes++ > budget) {
      result.status = "budget";
      return true;
    }
    if (row === n) {
      result.solutions.push(cols.map((col, r) => ({ row: r, col })));
      if (result.solutions.length >= limit) {
        result.status = "limit";
        return true;
      }
      return false;
    }
    for (let col = 0; col < n; col++) {
      if (usedCol[col]) continue;
      if (row > 0 && Math.abs(col - cols[row - 1]) <= 1) continue;
      const region = flat[row * n + col];
      if (usedRegion[region]) continue;
      usedCol[col] = true;
      usedRegion[region] = true;
      cols[row] = col;
      if (search(row + 1)) return true;
      usedCol[col] = false;
      usedRegion[region] = false;
    }
    return false;
  };

  search(0);
  if (result.status === "limit") return result;
  if (result.status === "budget") return result;
  result.status = "complete";
  return result;
}

export function uniqueSolution(level: Level, budget = 20_000): SearchResult {
  return countSolutions(level, 2, budget);
}
