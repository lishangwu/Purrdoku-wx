import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { miniLevel } from "./helpers";
import {
  applyHint,
  createPlay,
  ensureCatFaces,
  dragMarkPath,
  placeOn,
  previewHintBoard,
  restart,
  toggleCell,
  undo,
} from "../src/game/play";
import { defaultSettings } from "../src/types";
import { explainedHint } from "../src/engine/hint";
import { idx } from "./helpers";
import { starsFor } from "../src/engine/board";

describe("play session", () => {
  it("randomizes once per cat and preserves variants through undo and storage", (t) => {
    const play = createPlay(miniLevel(), { ...defaultSettings(), autoMarkEnabled: false });
    const random = t.mock.method(Math, "random", () => 0.45);
    placeOn(play, 1);
    assert.equal(random.mock.callCount(), 1);
    assert.equal(play.catFaces[1], 5);
    placeOn(play, 1);
    placeOn(play, 0);
    toggleCell(play, 2);
    ensureCatFaces(play);
    undo(play);
    assert.equal(play.catFaces[1], 5);
    const restored = JSON.parse(JSON.stringify(play));
    ensureCatFaces(restored);
    assert.equal(restored.catFaces[1], 5);
    assert.equal(random.mock.callCount(), 1);
    undo(play);
    undo(play);
    assert.ok(play.catFaces.every((face) => face === -1));
    for (const mode of ["infinite", "daily"] as const) {
      placeOn(play, 1);
      restart(play, mode);
      assert.ok(play.catFaces.every((face) => face === -1));
    }
  });

  it("assigns hinted cats once without randomizing during preview", (t) => {
    const play = createPlay(miniLevel());
    const plan = explainedHint(play.level, play.board)!;
    assert.equal(plan.kind, "place");
    const random = t.mock.method(Math, "random", () => 0.99);
    previewHintBoard(play.level, play.board, plan, true);
    assert.equal(random.mock.callCount(), 0);
    applyHint(play, plan);
    const cats = play.board.flatMap((cell, i) => cell === "cat" ? [i] : []);
    assert.ok(cats.length > 0);
    assert.equal(random.mock.callCount(), cats.length);
    assert.ok(cats.every((i) => play.catFaces[i] === 11));
    undo(play);
    assert.ok(play.catFaces.every((face) => face === -1));
  });

  it("merges placing a cat and auto-mark into a single undo", () => {
    const play = createPlay(miniLevel(), { ...defaultSettings(), autoMarkEnabled: true });
    placeOn(play, idx(4, 0, 1));
    assert.equal(play.history.length, 1);
    undo(play);
    assert.ok(play.board.every((cell) => cell === "empty"));
    assert.equal(play.mistakes, 0);
  });

  it("keeps cumulative misses after undo so flawless stays false", () => {
    const play = createPlay(miniLevel());
    placeOn(play, 0);
    assert.equal(play.mistakes, 1);
    assert.equal(play.totalMistakes, 1);
    undo(play);
    assert.equal(play.mistakes, 0);
    assert.equal(play.totalMistakes, 1);
    assert.equal(starsFor(play.mistakes), 3);
  });

  it("keeps cumulative hints and misses when restarting infinite mode", () => {
    const play = createPlay(miniLevel());
    play.hintsUsed = 2;
    play.totalMistakes = 4;
    play.totalElapsed = 30;
    restart(play, "infinite");
    assert.equal(play.hintsUsed, 2);
    assert.equal(play.totalMistakes, 4);
    assert.equal(play.totalElapsed, 30);
    assert.equal(play.mistakes, 0);
    assert.equal(play.restarts, 1);
    assert.ok(play.board.every((cell) => cell === "empty"));
  });

  it("applies a correction hint without counting a miss", () => {
    const play = createPlay(miniLevel());
    toggleCell(play, idx(4, 0, 1));
    const plan = explainedHint(play.level, play.board)!;
    applyHint(play, plan);
    assert.equal(play.board[idx(4, 0, 1)], "empty");
    assert.equal(play.mistakes, 0);
  });

  it("uses the same board for hint preview and application", () => {
    const play = createPlay(miniLevel());
    const plan = explainedHint(play.level, play.board)!;
    const preview = previewHintBoard(play.level, play.board, plan, true);
    assert.ok(preview);
    assert.equal(applyHint(play, plan), true);
    assert.deepEqual(play.board, preview);
  });

  it("keeps a turning drag as one undo step", () => {
    const play = createPlay(miniLevel());
    dragMarkPath(play, [0, 2, 10]);
    assert.equal(play.history.length, 1);
    assert.equal(play.board[1], "markedX");
    assert.equal(play.board[6], "markedX");
    undo(play);
    assert.ok(play.board.every((cell) => cell === "empty"));
  });
});
