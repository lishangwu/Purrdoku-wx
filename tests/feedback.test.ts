import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { milestoneFor } from "../src/game/feedback";

describe("game feedback", () => {
  it("marks the same journey milestones as H5", () => {
    assert.deepEqual([0, 1, 25, 50, 75, 100, 1000].map(milestoneFor), [
      "none",
      "none",
      "small",
      "small",
      "none",
      "large",
      "large",
    ]);
  });
});
