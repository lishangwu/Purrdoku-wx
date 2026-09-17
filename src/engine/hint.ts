import type { CellState, HintPlan, Level } from "../types";
import { boardKey } from "./board";
import { logicalSolve } from "./logic";

export const regionColorNames = [
  "豆沙粉",
  "奶油黄",
  "鼠尾草",
  "沙色",
  "雾蓝",
  "可可",
  "藕粉",
  "苔绿",
  "杏色",
];

export function explainedHint(
  level: Level,
  board: CellState[],
): HintPlan | null {
  const n = level.size;
  const flat = level.regions.flat();
  const cats = board.flatMap((s, i) => (s === "cat" ? [i] : []));
  if (cats.length === n) return null;

  const unitName = (u: number) =>
    u < n
      ? `第 ${u + 1} 行`
      : u < 2 * n
        ? `第 ${u - n + 1} 列`
        : `${regionColorNames[u - 2 * n] ?? "该颜色"}区域`;

  const member = (i: number, u: number) =>
    u < n
      ? Math.floor(i / n) === u
      : u < 2 * n
        ? i % n === u - n
        : flat[i] === u - 2 * n;

  const plan = (
    kind: HintPlan["kind"],
    title: string,
    reason: string,
    targets: number[],
    sources: number[],
    units: number[] = [],
  ): HintPlan => ({
    kind,
    title,
    reason,
    targets,
    sources,
    boardKey: boardKey(board),
    units,
  });

  const mistaken = level.solution
    .map((p) => p.row * n + p.col)
    .find((i) => board[i] === "markedX");
  if (mistaken !== undefined) {
    return plan(
      "correct",
      "先检查这个 ×",
      "核对题目答案后，这个 × 排除了正确的位置。先取消它，再继续推理；这一步是纠错，不是仅凭当前标记得出的结论。",
      [mistaken],
      [],
    );
  }

  for (const cat of cats) {
    const targets = board.flatMap((s, i) =>
      s === "empty" &&
      (Math.floor(i / n) === Math.floor(cat / n) ||
        i % n === cat % n ||
        flat[i] === flat[cat] ||
        (Math.abs(Math.floor(i / n) - Math.floor(cat / n)) <= 1 &&
          Math.abs((i % n) - (cat % n)) <= 1))
        ? [i]
        : [],
    );
    if (targets.length) {
      return plan(
        "exclude",
        "从这只猫开始排除",
        "每行、每列、每个颜色区域只能有一只猫，而且猫咪不能相邻。因此，这只猫的同行、同列、同色区域和周围八格中，白框标出的位置都可以标记 ×。",
        targets,
        [cat],
      );
    }
  }

  const excluded = board.flatMap((s, i) =>
    s === "markedX" || s === "wrongX" ? [i] : [],
  );
  const logic = logicalSolve(level, true, 200_000, { cats, excluded });
  const step = logic.steps[0];
  if (step) {
    const available = board.flatMap((s, i) => (s === "empty" ? [i] : []));
    const sources = available.filter((i) =>
      step.units.slice(0, step.rule === "C1" ? 2 : 1).some((u) => member(i, u)),
    );
    if (step.rule === "B1") {
      return plan(
        "place",
        "这里仅剩一个位置",
        `${unitName(step.units[0])}必须有一只猫。结合已放的猫和当前正确的 × 标记，只剩白框中的猫咪位置可以放猫。`,
        step.placed,
        sources,
        step.units,
      );
    }
    if (step.rule === "B3") {
      return plan(
        "exclude",
        "这个区域与直线互相锁定",
        `${unitName(step.units[0])}剩下的位置全部位于${unitName(step.units[1])}。这只猫会占用两者，因此${unitName(step.units[1])}中其余白框位置都不能再放猫。`,
        step.removed,
        sources,
        step.units,
      );
    }
    if (step.rule === "B4") {
      return plan(
        "exclude",
        "不论猫在哪，都会相邻",
        `${unitName(step.units[0])}必须放一只猫。无论它落在带 ◆ 的哪个候选格，都会与白框中的 × 位置相邻，所以这些位置可以排除。`,
        step.removed,
        sources,
        step.units,
      );
    }
    if (step.rule === "C1") {
      return plan(
        "exclude",
        "两只猫占满两组位置",
        `${unitName(step.units[0])}和${unitName(step.units[1])}各有一只猫，它们只能落在${unitName(step.units[2])}与${unitName(step.units[3])}中。这两组位置会被占满，其他白框位置可以排除。`,
        step.removed,
        sources,
        step.units,
      );
    }
  }

  const target = level.solution
    .map((p) => p.row * n + p.col)
    .find((i) => board[i] !== "cat");
  return target === undefined
    ? null
    : plan(
        "reveal",
        "直接揭示一个位置",
        "当前没有找到能用简短规则说明的下一步。这次直接揭示一个正确位置，不把答案包装成逻辑推理。",
        [target],
        [],
      );
}
