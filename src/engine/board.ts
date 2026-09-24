import type { CellState, Level } from "../types";

export function starsFor(mistakes: number): number {
  if (mistakes <= 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

export function toggleMark(
  board: CellState[],
  index: number,
): CellState[] | null {
  const cell = board[index];
  if (cell !== "empty" && cell !== "markedX") return null;
  const next = board.slice();
  next[index] = cell === "empty" ? "markedX" : "empty";
  return next;
}

export function autoMarkAround(
  level: Level,
  board: CellState[],
  index: number,
): void {
  const n = level.size;
  const row = Math.floor(index / n);
  const col = index % n;
  const region = level.regions[row][col];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== "empty") continue;
    const r = Math.floor(i / n);
    const c = i % n;
    if (
      r === row ||
      c === col ||
      level.regions[r][c] === region ||
      (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1)
    ) {
      board[i] = "markedX";
    }
  }
}

export function placeCat(
  level: Level,
  board: CellState[],
  index: number,
  autoMark: boolean,
): { board: CellState[]; correct: boolean } | null {
  if (board[index] === "cat" || board[index] === "wrongX") return null;
  const n = level.size;
  const correct = level.solution.some((p) => p.row * n + p.col === index);
  const next = board.slice();
  next[index] = correct ? "cat" : "wrongX";
  if (correct && autoMark) autoMarkAround(level, next, index);
  return { board: next, correct };
}

export function markLine(
  board: CellState[],
  from: number,
  to: number,
  size: number,
): CellState[] {
  const next = board.slice();
  const r0 = Math.floor(from / size);
  const c0 = from % size;
  const r1 = Math.floor(to / size);
  const c1 = to % size;
  const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  const paint = (index: number) => {
    if (next[index] === "empty") next[index] = "markedX";
  };
  paint(from);
  if (steps === 0) return next;
  for (let s = 1; s <= steps; s++) {
    const r = Math.round(r0 + ((r1 - r0) * s) / steps);
    const c = Math.round(c0 + ((c1 - c0) * s) / steps);
    paint(r * size + c);
  }
  return next;
}

export function markPath(
  board: CellState[],
  path: number[],
  size: number,
): CellState[] {
  if (path.length < 2) return board.slice();
  let next = board;
  for (let i = 1; i < path.length; i++) {
    next = markLine(next, path[i - 1], path[i], size);
  }
  return next;
}

export function won(level: Level, board: CellState[]): boolean {
  const n = level.size;
  return level.solution.every((p) => board[p.row * n + p.col] === "cat");
}

export function boardKey(board: CellState[]): string {
  return board.join("|");
}

export function emptyBoard(size: number): CellState[] {
  return Array.from({ length: size * size }, () => "empty");
}
