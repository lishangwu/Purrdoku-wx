import type { Level } from "../types";
import { validRegions } from "./structure";

export type Rule = "B1" | "B2" | "B3" | "B4" | "C1";

export interface LogicStep {
  rule: Rule;
  placed: number[];
  removed: number[];
  units: number[];
}

export interface LogicResult {
  status: "solved" | "stalled" | "budget" | "invalid";
  cats: number[];
  steps: LogicStep[];
  operations: number;
}

export function logicalSolve(
  puzzle: Level,
  combinations = false,
  maxOperations = 200_000,
  initial?: { cats: number[]; excluded: number[] },
): LogicResult {
  const result: LogicResult = {
    status: "stalled",
    cats: [],
    steps: [],
    operations: 0,
  };
  if (!validRegions(puzzle)) {
    result.status = "invalid";
    return result;
  }
  const n = puzzle.size;
  const flat = puzzle.regions.flat();
  const count = n * n;
  const memberships = Array.from({ length: count }, (_, i) => [
    Math.floor(i / n),
    n + (i % n),
    2 * n + flat[i],
  ]);
  const units = Array.from({ length: 3 * n }, (_, u) =>
    memberships.flatMap((m, i) => (m.includes(u) ? [i] : [])),
  );
  const possible = new Set(Array.from({ length: count }, (_, i) => i));
  const cats = new Set<number>();
  const done = new Set<number>();

  if (initial) {
    for (const i of initial.excluded) possible.delete(i);
    for (const i of initial.cats) {
      cats.add(i);
      possible.delete(i);
      memberships[i].forEach((u) => done.add(u));
    }
  }

  const adjacent = (a: number, b: number) =>
    Math.abs(Math.floor(a / n) - Math.floor(b / n)) <= 1 &&
    Math.abs((a % n) - (b % n)) <= 1;

  const spend = () => {
    if (++result.operations > maxOperations) {
      result.status = "budget";
      return false;
    }
    return true;
  };

  const remove = (rule: Rule, cells: number[], sources: number[]) => {
    const removed = cells.filter((i) => possible.has(i));
    if (!removed.length) return false;
    removed.forEach((i) => possible.delete(i));
    result.steps.push({ rule, removed, placed: [], units: sources });
    return true;
  };

  while (cats.size < n) {
    if (!spend()) break;
    const available = units.map((cells, u) =>
      done.has(u) ? [] : cells.filter((i) => possible.has(i)),
    );
    if (available.some((cells, u) => !done.has(u) && !cells.length)) {
      result.status = "invalid";
      break;
    }
    let changed = false;
    for (let u = 0; u < units.length; u++) {
      if (available[u].length !== 1) continue;
      const i = available[u][0];
      cats.add(i);
      possible.delete(i);
      memberships[i].forEach((x) => done.add(x));
      result.steps.push({ rule: "B1", placed: [i], removed: [], units: [u] });
      remove(
        "B2",
        [...possible].filter(
          (j) =>
            memberships[j].some((x) => memberships[i].includes(x)) ||
            adjacent(i, j),
        ),
        memberships[i],
      );
      changed = true;
      break;
    }
    if (changed) continue;
    for (let u = 0; u < units.length && !changed; u++) {
      if (done.has(u)) continue;
      for (let v = 0; v < units.length; v++) {
        if (!spend()) return { ...result, cats: [...cats] };
        if (done.has(v) || u >= 2 * n === v >= 2 * n) continue;
        if (available[u].every((i) => memberships[i].includes(v))) {
          changed = remove(
            "B3",
            available[v].filter((i) => !memberships[i].includes(u)),
            [u, v],
          );
          if (changed) break;
        }
      }
    }
    if (changed) continue;
    for (let u = 0; u < units.length && !changed; u++) {
      if (done.has(u)) continue;
      for (const i of possible) {
        if (!spend()) return { ...result, cats: [...cats] };
        if (
          !memberships[i].includes(u) &&
          available[u].every((j) => adjacent(i, j))
        ) {
          changed = remove("B4", [i], [u]);
          break;
        }
      }
    }
    if (changed) continue;
    if (combinations) {
      for (const [sourceOffset, targetOffset] of [
        [2 * n, 0],
        [2 * n, n],
        [0, 2 * n],
        [n, 2 * n],
      ]) {
        for (let a = sourceOffset; a < sourceOffset + n && !changed; a++) {
          if (done.has(a)) continue;
          for (let b = a + 1; b < sourceOffset + n; b++) {
            if (!spend()) return { ...result, cats: [...cats] };
            if (done.has(b)) continue;
            const candidates = [...available[a], ...available[b]];
            const targets = [
              ...new Set(
                candidates.map((i) => memberships[i][targetOffset / n]),
              ),
            ];
            if (targets.length !== 2) continue;
            changed = remove(
              "C1",
              [...possible].filter(
                (i) =>
                  targets.some((t) => memberships[i].includes(t)) &&
                  !memberships[i].includes(a) &&
                  !memberships[i].includes(b),
              ),
              [a, b, ...targets],
            );
            if (changed) break;
          }
        }
        if (changed) break;
      }
    }
    if (!changed) break;
  }
  result.cats = [...cats].sort((a, b) => a - b);
  if (cats.size === n) result.status = "solved";
  return result;
}
