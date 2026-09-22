export type CellState = "empty" | "markedX" | "cat" | "wrongX";
export type Difficulty = "easy" | "normal" | "hard" | "expert";
export type Purpose = "normal" | "challenge" | "relax";
export type LevelSource = "generated" | "opening" | "fallback";

export interface Position {
  row: number;
  col: number;
}

export interface Rating {
  score: number;
  band: Difficulty;
  B: number;
  F: number;
  R: number;
  C: number;
  D: number;
  W: number;
}

export interface Level {
  id: string;
  size: number;
  regions: number[][];
  solution: Position[];
  difficulty: Difficulty;
  seed?: string;
  source?: LevelSource;
  rating?: Rating;
  signature?: string;
}

export interface Snapshot {
  board: CellState[];
  mistakes: number;
  catFaces?: number[];
}

export type HintKind = "place" | "exclude" | "correct" | "reveal";

export interface HintPlan {
  kind: HintKind;
  title: string;
  reason: string;
  targets: number[];
  sources: number[];
  boardKey: string;
  units?: number[];
}

export interface Settings {
  autoMarkEnabled: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticEnabled: boolean;
  animationsEnabled: boolean;
}

export const defaultSettings = (): Settings => ({
  autoMarkEnabled: true,
  soundEnabled: true,
  musicEnabled: false,
  hapticEnabled: true,
  animationsEnabled: true,
});
