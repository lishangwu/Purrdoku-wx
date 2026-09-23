import { it } from "node:test";
import assert from "node:assert/strict";
import { presentHint } from "../src/ui/hint-presentation";
import { emptyBoard, boardKey } from "../src/engine/board";
import { previewHintBoard } from "../src/game/play";
import { miniLevel } from "./helpers";
import type { HintPlan } from "../src/types";

it("uses actual unit direction for both line-to-region and region-to-line hints", () => {
  const level = miniLevel();
  const plan: HintPlan = { kind: "exclude", rule: "B3", units: [4, 8], sources: [], targets: [], title: "", reason: "", boardKey: "" };
  assert.match(presentHint(level, plan).steps[0]!.description, /第1列/);
  plan.units = [8, 4];
  assert.match(presentHint(level, plan).steps[0]!.description, /区域/);
  assert.match(presentHint(level, plan).steps[3]!.description, /第1列/);
});

it("placing a hint changes only its target even when automatic marking is enabled", () => {
  const level = miniLevel();
  const board = emptyBoard(level.size);
  const target = level.solution[0]!.row * level.size + level.solution[0]!.col;
  const plan: HintPlan = { kind: "place", targets: [target], sources: [], boardKey: boardKey(board), title: "", reason: "" };
  const preview = previewHintBoard(level, board, plan, true)!;
  assert.equal(preview[target], "cat");
  assert.deepEqual(preview.flatMap((state, i) => state !== board[i] ? [i] : []), [target]);
  assert.ok(board.every(state => state === "empty"));
});

it("all modes present the same single-step result without changing the board or plan", () => {
  const level = miniLevel();
  const board = emptyBoard(level.size);
  for (const kind of ["exclude", "place", "correct", "reveal"] as const) {
    const target = level.solution[0]!.row * level.size + level.solution[0]!.col;
    const plan: HintPlan = { kind, targets: [target], sources: [0], units: [4, 8], rule: "B3", boardKey: boardKey(board), title: "", reason: "" };
    const before = JSON.stringify({ board, plan });
    const results = (["interactive", "auto", "direct"] as const).map(mode => {
      const presentation = presentHint(level, plan, mode);
      if (mode === "direct") {
        assert.equal(presentation.steps.length, 1);
        assert.deepEqual(presentation.steps[0]!.focusCells, plan.targets);
      }
      assert.deepEqual(presentation.steps.at(-1)!.resultCells, plan.targets);
      return previewHintBoard(level, board, plan, true);
    });
    assert.deepEqual(results[0], results[1]);
    assert.deepEqual(results[0], results[2]);
    assert.equal(JSON.stringify({ board, plan }), before);
  }
});
