import type { Level } from "../src/types";

/** 4×4 教学盘：每只猫在独立连通色块里，且八方向不相邻。 */
export function miniLevel(): Level {
  return {
    id: "mini-4",
    size: 4,
    regions: [
      [2, 0, 1, 1],
      [2, 2, 1, 1],
      [2, 3, 3, 1],
      [2, 3, 3, 3],
    ],
    solution: [
      { row: 0, col: 1 },
      { row: 1, col: 3 },
      { row: 2, col: 0 },
      { row: 3, col: 2 },
    ],
    difficulty: "easy",
  };
}

export function idx(size: number, row: number, col: number) {
  return row * size + col;
}
