import { CAT_SPRITE_PATHS } from "./cat-variants";
import type { CellState, HintPlan, Level, Settings, Snapshot } from "../types";
import {
  boardKey,
  emptyBoard,
  markPath,
  placeCat,
  starsFor,
  toggleMark,
  won,
} from "../engine/board";
import { explainedHint } from "../engine/hint";
import { defaultSettings } from "../types";

export interface PlayState {
  level: Level;
  board: CellState[];
  /** 与 board 等长：猫格的表情索引 0–11，非猫为 -1 */
  catFaces: number[];
  mistakes: number;
  totalMistakes: number;
  hintsUsed: number;
  elapsed: number;
  totalElapsed: number;
  restarts: number;
  history: Snapshot[];
  completed: boolean;
  recorded: boolean;
  instanceId: string;
  settings: Settings;
}

export const CAT_FACE_COUNT = CAT_SPRITE_PATHS.length;

export function randomCatFace(): number {
  return Math.floor(Math.random() * CAT_FACE_COUNT);
}

function emptyFaces(size: number): number[] {
  return Array.from({ length: size * size }, () => -1);
}

/** 旧存档补齐 catFaces；已有猫格随机分配表情 */
export function ensureCatFaces(play: PlayState): void {
  const n = play.board.length;
  if (!play.catFaces || play.catFaces.length !== n) {
    play.catFaces = Array.from({ length: n }, (_, i) => play.catFaces?.[i] ?? -1);
  }
  for (let i = 0; i < n; i++) {
    if (play.board[i] === "cat" && (!Number.isInteger(play.catFaces[i]) || play.catFaces[i] < 0 || play.catFaces[i] >= CAT_FACE_COUNT)) {
      play.catFaces[i] = randomCatFace();
    }
    if (play.board[i] !== "cat") play.catFaces[i] = -1;
  }
}

function syncFaces(play: PlayState, prev: CellState[], next: CellState[]): void {
  for (let i = 0; i < next.length; i++) {
    if (next[i] === "cat" && prev[i] !== "cat") play.catFaces[i] = randomCatFace();
    else if (next[i] !== "cat") play.catFaces[i] = -1;
  }
}

export function createPlay(level: Level, settings: Settings = defaultSettings()): PlayState {
  return {
    level,
    board: emptyBoard(level.size),
    catFaces: emptyFaces(level.size),
    mistakes: 0,
    totalMistakes: 0,
    hintsUsed: 0,
    elapsed: 0,
    totalElapsed: 0,
    restarts: 0,
    history: [],
    completed: false,
    recorded: false,
    instanceId: `${level.id}:${Date.now()}`,
    settings,
  };
}

function pushHistory(play: PlayState): void {
  ensureCatFaces(play);
  play.history.push({
    board: play.board.slice(),
    mistakes: play.mistakes,
    catFaces: play.catFaces.slice(),
  });
  if (play.history.length > 100) play.history.shift();
}

function editable(play: PlayState): boolean {
  return !play.completed;
}

export function toggleCell(play: PlayState, index: number): boolean {
  if (!editable(play)) return false;
  const next = toggleMark(play.board, index);
  if (!next) return false;
  pushHistory(play);
  play.board = next;
  return true;
}

export function placeOn(play: PlayState, index: number): boolean {
  if (!editable(play)) return false;
  const result = placeCat(play.level, play.board, index, play.settings.autoMarkEnabled);
  if (!result) return false;
  pushHistory(play);
  const prev = play.board;
  play.board = result.board;
  syncFaces(play, prev, result.board);
  if (!result.correct) {
    play.mistakes += 1;
    play.totalMistakes += 1;
  }
  if (won(play.level, play.board)) play.completed = true;
  return true;
}

export function dragMark(play: PlayState, from: number, to: number): boolean {
  return dragMarkPath(play, [from, to]);
}

export function dragMarkPath(play: PlayState, path: number[]): boolean {
  if (!editable(play)) return false;
  const next = markPath(play.board, path, play.level.size);
  if (next.every((cell, i) => cell === play.board[i])) return false;
  pushHistory(play);
  play.board = next;
  return true;
}

export function undo(play: PlayState): boolean {
  if (!editable(play) || !play.history.length) return false;
  const snap = play.history.pop()!;
  play.board = snap.board;
  play.mistakes = snap.mistakes;
  if (snap.catFaces && snap.catFaces.length === play.board.length) {
    play.catFaces = snap.catFaces.slice();
  } else {
    ensureCatFaces(play);
  }
  return true;
}

export function restart(play: PlayState, mode: "infinite" | "daily"): void {
  if (mode === "infinite") {
    play.restarts += 1;
    play.board = emptyBoard(play.level.size);
    play.catFaces = emptyFaces(play.level.size);
    play.mistakes = 0;
    play.elapsed = 0;
    play.history = [];
    play.completed = false;
    return;
  }
  const kept = {
    totalElapsed: play.totalElapsed,
    hintsUsed: 0,
    totalMistakes: 0,
  };
  const next = createPlay(play.level, play.settings);
  Object.assign(play, next, kept);
}

export function tick(play: PlayState, seconds: number, running: boolean): void {
  if (!running || play.completed) return;
  play.elapsed += seconds;
  play.totalElapsed += seconds;
}

export function peekHint(play: PlayState): HintPlan | null {
  return explainedHint(play.level, play.board);
}

export function noteHintShown(play: PlayState): void {
  play.hintsUsed += 1;
}

export function previewHintBoard(
  level: Level,
  board: CellState[],
  plan: HintPlan,
  _autoMark: boolean,
): CellState[] | null {
  if (plan.boardKey !== boardKey(board)) return null;
  const next = board.slice();
  if (plan.kind === "correct") {
    for (const i of plan.targets) if (next[i] === "markedX") next[i] = "empty";
    return next;
  }
  if (plan.kind === "exclude") {
    for (const i of plan.targets) if (next[i] === "empty") next[i] = "markedX";
    return next;
  }
  let result = next;
  for (const i of plan.targets) {
    const placed = placeCat(level, result, i, false);
    if (placed) result = placed.board;
  }
  return result;
}

export function applyHint(play: PlayState, plan: HintPlan): boolean {
  if (!editable(play)) return false;
  const next = previewHintBoard(play.level, play.board, plan, play.settings.autoMarkEnabled);
  if (!next) return false;
  pushHistory(play);
  const prev = play.board.slice();
  play.board = next;
  syncFaces(play, prev, play.board);
  if (won(play.level, play.board)) play.completed = true;
  return true;
}

export function resultOf(play: PlayState) {
  return {
    stars: starsFor(play.mistakes),
    independent: play.hintsUsed === 0,
    flawless: play.totalMistakes === 0,
    elapsed: play.elapsed,
  };
}
