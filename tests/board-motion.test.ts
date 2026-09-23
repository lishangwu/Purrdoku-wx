import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catIdleFrame, regionFlashAmount, sampleBoardMotion } from "../src/ui/board-motion";

describe("board motion", () => {
  it("animates marks in and out over the H5 timing", () => {
    assert.deepEqual(sampleBoardMotion("mark-in", 0), {
      alive: true,
      opacity: 0,
      scale: 0.65,
      shakeX: 0,
    });
    assert.equal(sampleBoardMotion("mark-in", 130).scale, 1);
    assert.equal(sampleBoardMotion("mark-out", 130).opacity, 0);
  });

  it("pops cats and finishes at their natural size", () => {
    assert.equal(sampleBoardMotion("cat-in", 0).scale, 0);
    assert.equal(sampleBoardMotion("cat-in", 196).scale, 1.13);
    assert.equal(sampleBoardMotion("cat-in", 280).scale, 1);
  });

  it("flashes once and keeps idle cats static when motion is paused", () => {
    assert.ok(regionFlashAmount(225) > 0.15);
    assert.equal(regionFlashAmount(450), 0);
    assert.equal(catIdleFrame(2790, 0, true), 1);
    assert.equal(catIdleFrame(2790, 0, false), 0);
    assert.notEqual(catIdleFrame(2790, 1, true), catIdleFrame(2790, 0, true));
  });
});
