import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOARD_PULSE_MS,
  LAST_CAT_HOLD_MS,
  boardSuccessScale,
  celebrationElapsed,
  createConfetti,
} from "../src/ui/level-complete";

describe("level complete presentation", () => {
  it("holds the celebration until the last cat has appeared", () => {
    assert.equal(celebrationElapsed(LAST_CAT_HOLD_MS - 1), 0);
    assert.equal(celebrationElapsed(LAST_CAT_HOLD_MS + 120), 120);
  });

  it("uses a subtle 1 → 1.02 → 1 board pulse", () => {
    assert.equal(boardSuccessScale(0), 1);
    assert.equal(boardSuccessScale(LAST_CAT_HOLD_MS), 1);
    assert.equal(boardSuccessScale(LAST_CAT_HOLD_MS + BOARD_PULSE_MS / 2), 1.02);
    assert.equal(boardSuccessScale(LAST_CAT_HOLD_MS + BOARD_PULSE_MS), 1);
  });

  it("creates a small mixed particle set", () => {
    const particles = createConfetti();
    assert.equal(particles.length, 24);
    assert.deepEqual(new Set(particles.map((particle) => particle.shape)), new Set(["dot", "star", "paw"]));
  });
});
