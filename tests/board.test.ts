import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { idx, miniLevel } from "./helpers";
import {
  autoMarkAround,
  emptyBoard,
  markLine,
  placeCat,
  starsFor,
  toggleMark,
  won,
} from "../src/engine/board";

describe("board rules", () => {
  it("gives three stars at 0 mistakes, two at 1-2, one at 3+", () => {
    assert.equal(starsFor(0), 3);
    assert.equal(starsFor(1), 2);
    assert.equal(starsFor(2), 2);
    assert.equal(starsFor(3), 1);
    assert.equal(starsFor(9), 1);
  });

  it("toggles empty cells to notes and back", () => {
    const board = emptyBoard(4);
    const marked = toggleMark(board, 0);
    assert.equal(marked?.[0], "markedX");
    const cleared = toggleMark(marked!, 0);
    assert.equal(cleared?.[0], "empty");
  });

  it("does not let a click erase a cat or a wrong mark", () => {
    const board = emptyBoard(4);
    board[0] = "cat";
    board[1] = "wrongX";
    assert.equal(toggleMark(board, 0), null);
    assert.equal(toggleMark(board, 1), null);
  });

  it("places a correct cat and a wrong cat against the saved answer", () => {
    const level = miniLevel();
    const board = emptyBoard(4);
    const ok = placeCat(level, board, idx(4, 0, 1), false);
    assert.equal(ok?.correct, true);
    assert.equal(ok?.board[idx(4, 0, 1)], "cat");
    const bad = placeCat(level, board, idx(4, 0, 0), false);
    assert.equal(bad?.correct, false);
    assert.equal(bad?.board[idx(4, 0, 0)], "wrongX");
  });

  it("counts a second attempt on a wrong cell as another miss", () => {
    const level = miniLevel();
    const board = emptyBoard(4);
    const first = placeCat(level, board, 0, false)!;
    assert.equal(first.correct, false);
    const second = placeCat(level, first.board, 0, false)!;
    assert.equal(second.correct, false);
    assert.equal(second.board[0], "wrongX");
  });

  it("auto-marks the row, column, region and 8-neighborhood of a placed cat", () => {
    const level = miniLevel();
    const board = emptyBoard(4);
    const placed = placeCat(level, board, idx(4, 0, 1), true)!;
    assert.equal(placed.board[idx(4, 0, 0)], "markedX");
    assert.equal(placed.board[idx(4, 0, 2)], "markedX");
    assert.equal(placed.board[idx(4, 1, 1)], "markedX");
    assert.equal(placed.board[idx(4, 1, 0)], "markedX");
    assert.equal(placed.board[idx(4, 1, 2)], "markedX");
    assert.equal(placed.board[idx(4, 2, 0)], "empty");
  });

  it("does not overwrite existing notes when auto-marking", () => {
    const level = miniLevel();
    const board = emptyBoard(4);
    board[idx(4, 0, 0)] = "markedX";
    autoMarkAround(level, board, idx(4, 0, 1));
    assert.equal(board[idx(4, 0, 0)], "markedX");
  });

  it("interpolates a drag so a diagonal swipe still marks both ends", () => {
    const board = emptyBoard(4);
    const next = markLine(board, idx(4, 0, 0), idx(4, 2, 2), 4);
    assert.equal(next[idx(4, 0, 0)], "markedX");
    assert.equal(next[idx(4, 1, 1)], "markedX");
    assert.equal(next[idx(4, 2, 2)], "markedX");
    assert.equal(next[idx(4, 0, 1)], "empty");
  });

  it("does not let a drag cover cats or wrong marks", () => {
    const board = emptyBoard(4);
    board[idx(4, 1, 1)] = "cat";
    const next = markLine(board, idx(4, 0, 0), idx(4, 2, 2), 4);
    assert.equal(next[idx(4, 1, 1)], "cat");
  });

  it("wins only when every correct cat is placed, even if empty cells remain", () => {
    const level = miniLevel();
    const board = emptyBoard(4);
    assert.equal(won(level, board), false);
    for (const p of level.solution) board[idx(4, p.row, p.col)] = "cat";
    assert.equal(won(level, board), true);
    assert.ok(board.some((cell) => cell === "empty"));
  });
});
