import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { miniLevel } from "./helpers";
import { applyHint, createPlay, dragMarkPath, placeOn, restart, toggleCell, undo } from "../src/game/play";
import { defaultSettings } from "../src/types";
import { explainedHint } from "../src/engine/hint";
import { idx } from "./helpers";
import { starsFor } from "../src/engine/board";

describe("play session", () => {
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
