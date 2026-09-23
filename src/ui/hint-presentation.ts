import type { HintPlan, Level, Settings } from "../types";
import { regionColorNames } from "../engine/hint";

export interface HintStep {
  description: string;
  focusCells: number[];
  resultCells: number[];
}

export function presentHint(level: Level, hint: HintPlan, mode: Settings["hintMode"] = "interactive") {
  const cta = hint.kind === "exclude" ? "应用这些 ×" : hint.kind === "place" || hint.kind === "reveal" ? "把猫放这里" : "取消这个 ×";
  if (mode === "direct") {
    const title = hint.kind === "exclude" ? "这些位置可以排除"
      : hint.kind === "correct" ? "这个 × 需要取消" : "猫可以确定在这里";
    const description = hint.kind === "correct" ? "核对答案后，这个 × 划掉了正确位置。"
      : hint.kind === "reveal" ? "这是答案中的一个位置。" : "只应用这一步亮起的位置。";
    return { title, cta, steps: [{ description, focusCells: hint.targets, resultCells: hint.targets }] };
  }
  const n = level.size;
  const units = hint.units ?? [];
  const name = (u: number) => u < n ? `第${u + 1}行` : u < n * 2
    ? `第${u - n + 1}列` : `${regionColorNames[u - n * 2] ?? "这个颜色"}区域`;
  const members = (u: number) => level.regions.flat().flatMap((region, i) =>
    (u < n ? Math.floor(i / n) === u : u < n * 2 ? i % n === u - n : region === u - n * 2) ? [i] : []);
  const first = units[0] === undefined ? "这些位置" : name(units[0]);
  const second = units[1] === undefined ? "这些位置" : name(units[1]);
  let title = "这些位置都不能放猫";
  let steps = [`先看${first}`, "不管猫放在哪个亮起的位置，都会和这些格子相邻。", "所以这些位置都可以标上 ×。"];
  if (hint.rule === "B1" || hint.kind === "place") {
    title = "这只猫只能在这里";
    steps = [`先看${first}`, `${first}还缺一只猫，能放猫的只剩这个格子。`, "所以把猫放在这里。"];
  } else if (hint.rule === "B3") {
    title = `${first}的猫，一定在${second}里`;
    steps = [`先看${first}`, `${first}的猫只能在这些亮起的位置。`, `这些位置全在${second}里。`, `所以${second}里其他位置都不能放猫。`];
  } else if (hint.rule === "C1") {
    title = "这两处的猫占满了另外两处";
    steps = [`先看${first}和${second}`, `它们各缺一只猫，只能放在${name(units[2]!)}和${name(units[3]!)}。`, "这两处各被一只猫占用，其他亮起的位置都不能放猫。"];
  } else if (hint.kind === "exclude" && !units.length) {
    title = "这只猫已经排除了这些位置";
    steps = ["先看这只猫", "同一行、列、颜色区域不能再放猫，周围也不能有猫。", "所以这些位置都可以标上 ×。"];
  } else if (hint.kind === "correct") {
    title = "先检查这个 ×";
    steps = ["先看这个 ×", "核对答案后，这个 × 划掉了正确位置；这是纠错。", "先取消这个 ×，再自己想想。"];
  } else if (hint.kind === "reveal") {
    title = "直接揭示一个位置";
    steps = ["这一步需要直接查看答案", "暂时没有找到能用简短规则解释的下一步。", "这是答案中的一个位置，并非从当前标记推导出来。"];
  }
  const focus = units.length ? members(units[0]!) : hint.sources.length ? hint.sources : hint.targets;
  const related = units.slice(1).flatMap(members);
  return {
    title,
    steps: steps.map((description, stage): HintStep => ({
      description,
      focusCells: stage === 0 ? focus : [...hint.sources, ...(stage >= 2 ? related : []), ...(stage === steps.length - 1 ? hint.targets : [])],
      resultCells: stage === steps.length - 1 ? hint.targets : [],
    })),
    cta,
  };
}
