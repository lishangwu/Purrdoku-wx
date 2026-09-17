import type { CellState, HintPlan, Level, Settings, Snapshot } from "../types";
import {
  boardKey,
  emptyBoard,
  markLine,
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

export function createPlay(level: Level, settings: Settings = defaultSettings()): PlayState {
  return {
    level,
    board: emptyBoard(level.size),
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
  play.history.push({ board: play.board.slice(), mistakes: play.mistakes });
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
  play.board = result.board;
  if (!result.correct) {
    play.mistakes += 1;
    play.totalMistakes += 1;
  }
  if (won(play.level, play.board)) play.completed = true;
  return true;
}

export function dragMark(play: PlayState, from: number, to: number): boolean {
  if (!editable(play)) return false;
  const next = markLine(play.board, from, to, play.level.size);
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
  return true;
}

export function restart(play: PlayState, mode: "infinite" | "daily"): void {
  if (mode === "infinite") {
    play.restarts += 1;
    play.board = emptyBoard(play.level.size);
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

export function applyHint(play: PlayState, plan: HintPlan): boolean {
  if (!editable(play)) return false;
  if (plan.boardKey !== boardKey(play.board)) return false;
  pushHistory(play);
  if (plan.kind === "correct") {
    const next = play.board.slice();
    for (const i of plan.targets) if (next[i] === "markedX") next[i] = "empty";
    play.board = next;
    return true;
  }
  if (plan.kind === "exclude") {
    const next = play.board.slice();
    for (const i of plan.targets) if (next[i] === "empty") next[i] = "markedX";
    play.board = next;
    return true;
  }
  for (const i of plan.targets) {
    const result = placeCat(play.level, play.board, i, play.settings.autoMarkEnabled);
    if (result) play.board = result.board;
  }
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
