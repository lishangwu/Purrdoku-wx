import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rateFromMetrics, scoreBand, semanticFloor } from "../src/engine/difficulty";

describe("V5 rating", () => {
  it("maps the documented 7x7 example to 36 standard", () => {
    const rating = rateFromMetrics({
      size: 7,
      F: 2,
      R: 3,
      C: 1,
      D: 8,
    });
    assert.equal(rating.score, 36);
    assert.equal(rating.band, "normal");
  });

  it("applies semantic floors before banding", () => {
    assert.equal(semanticFloor({ F: 0, R: 0, C: 1 }), 25);
    assert.equal(semanticFloor({ F: 5, R: 0, C: 0 }), 45);
    assert.equal(semanticFloor({ F: 0, R: 0, C: 3 }), 65);
    assert.equal(scoreBand(24), "easy");
    assert.equal(scoreBand(25), "normal");
    assert.equal(scoreBand(45), "hard");
    assert.equal(scoreBand(65), "expert");
  });
});
