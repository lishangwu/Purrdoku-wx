import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { idx, miniLevel } from "./helpers";
import { explainedHint } from "../src/engine/hint";
import { emptyBoard, placeCat } from "../src/engine/board";

describe("explained hints", () => {
  it("corrects a note that covers an answer cell and admits checking the key", () => {
    const level = miniLevel();
    const board = emptyBoard(4);
    board[idx(4, 0, 1)] = "markedX";
    const hint = explainedHint(level, board)!;
    assert.equal(hint.kind, "correct");
    assert.deepEqual(hint.targets, [idx(4, 0, 1)]);
    assert.match(hint.reason, /答案/);
  });

  it("excludes cells around an already placed cat before deeper logic", () => {
    const level = miniLevel();
    const board = emptyBoard(4);
    const placed = placeCat(level, board, idx(4, 0, 1), false)!;
    const hint = explainedHint(level, placed.board)!;
    assert.equal(hint.kind, "exclude");
    assert.ok(hint.targets.includes(idx(4, 0, 0)));
    assert.ok(hint.targets.includes(idx(4, 1, 1)));
  });

  it("does not mutate the board while planning", () => {
    const level = miniLevel();
    const board = emptyBoard(4);
    const snapshot = board.slice();
    explainedHint(level, board);
    assert.deepEqual(board, snapshot);
  });

  it("falls back to an honest reveal when no short rule remains", () => {
    const level = miniLevel();
    const board = emptyBoard(4);
    for (let i = 0; i < 16; i++) board[i] = "markedX";
    for (const p of level.solution) board[idx(4, p.row, p.col)] = "empty";
    board[idx(4, 0, 1)] = "cat";
    board[idx(4, 1, 3)] = "cat";
    board[idx(4, 2, 0)] = "cat";
    const hint = explainedHint(level, board)!;
    assert.ok(hint.kind === "place" || hint.kind === "reveal");
  });
});
