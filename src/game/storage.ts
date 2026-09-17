import type { Settings } from "../types";
import type { PlayState } from "../game/play";
import type { PaceHistory } from "../engine/pacer";

export const SAVE_KEY = "purrdoku.save.v1";
export const INFINITE_KEY = "purrdoku.infinite.v1";

export interface DailyRecord {
  play: PlayState;
  bestStars: number;
  bestTime: number;
}

export interface ShellSave {
  settings: Settings;
  daily: Record<string, DailyRecord>;
}

export interface InfiniteSave {
  playerSeed: string;
  ordinal: number;
  play: PlayState | null;
  stats: { completed: number; independent: number; flawless: number };
  history: PaceHistory[];
  sizeCounts: Record<number, number>;
}

export interface StoragePort {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

export function readJson<T>(store: StoragePort, key: string, fallback: T): T {
  try {
    const raw = store.get(key);
    if (!raw || typeof raw !== "object") return fallback;
    return raw as T;
  } catch {
    return fallback;
  }
}

export function writeJson(store: StoragePort, key: string, value: unknown): void {
  try {
    store.set(key, JSON.parse(JSON.stringify(value)));
  } catch {
    /* keep playing in memory */
  }
}

export function wxStore(): StoragePort {
  return {
    get(key) {
      try {
        return wx.getStorageSync(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      wx.setStorageSync(key, value);
    },
  };
}
