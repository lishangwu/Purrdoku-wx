import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { beginPress, keepPress, releasePress } from "../src/ui/input";

const targets = [
  { id: "back", rect: { x: 0, y: 0, w: 40, h: 40 } },
  { id: "close", rect: { x: 10, y: 10, w: 40, h: 40 } },
];

describe("UI press tracking", () => {
  it("uses the topmost target and requires press and release on the same target", () => {
    const press = beginPress(targets, 20, 20, 1);
    assert.deepEqual(press, { id: "close", touchId: 1 });
    assert.equal(releasePress(press, targets, 20, 20, 1), "close");
    assert.equal(releasePress(press, targets, 5, 5, 1), null);
  });

  it("cancels a press after moving off its target and ignores another touch", () => {
    const press = beginPress(targets, 20, 20, 1);
    assert.equal(keepPress(press, targets, 80, 80, 1), null);
    assert.equal(keepPress(press, targets, 80, 80, 2), press);
    assert.equal(releasePress(press, targets, 20, 20, 2), null);
  });
});
