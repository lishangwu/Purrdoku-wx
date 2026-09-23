import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { windowMetrics } from "../src/platform/env";
import { FRAME_INTERVAL_MS, shouldRenderFrame } from "../src/ui/frame-pacer";

describe("device runtime", () => {
  it("keeps safe-area insets on compact high-DPR phones", () => {
    assert.deepEqual(
      windowMetrics({
        windowWidth: 320,
        windowHeight: 568,
        pixelRatio: 3,
        statusBarHeight: 20,
        safeArea: { top: 24, bottom: 548, left: 0, right: 320 },
      }),
      { width: 320, height: 568, pixelRatio: 3, insetTop: 24, insetBottom: 20 },
    );
  });

  it("uses the status bar and clamps invalid dimensions", () => {
    assert.deepEqual(
      windowMetrics({ windowWidth: 0, windowHeight: 0, pixelRatio: 0, statusBarHeight: 18 }),
      { width: 1, height: 1, pixelRatio: 1, insetTop: 18, insetBottom: 0 },
    );
  });

  it("limits full-canvas rendering to about 30 FPS", () => {
    assert.equal(shouldRenderFrame(100, 0), true);
    assert.equal(shouldRenderFrame(100 + FRAME_INTERVAL_MS / 2, 100), false);
    assert.equal(shouldRenderFrame(100 + FRAME_INTERVAL_MS, 100), true);
  });
});
