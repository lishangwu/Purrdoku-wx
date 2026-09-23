import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { playTopBarLayout } from "../src/ui/top-bar-layout";

describe("play top bar layout", () => {
  it("keeps the existing layout when no native capsule is available", () => {
    assert.deepEqual(playTopBarLayout(32, null), {
      controlsY: 34,
      settingsY: 34,
      statusY: 86,
      contentY: 102,
    });
  });

  it("places settings below the native capsule and reserves the next row", () => {
    const layout = playTopBarLayout(32, 80);
    assert.equal(layout.controlsY, 34);
    assert.equal(layout.settingsY, 88);
    assert.equal(layout.statusY, 86);
    assert.equal(layout.contentY, 136);
  });
});
