import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MISTAKE_HELP_DURATION_MS,
  mistakeHelpPulse,
  shouldOfferMistakeHelp,
} from "../src/ui/mistake-help";

describe("mistake rescue prompt", () => {
  it("appears once when the third real mistake is reached", () => {
    assert.equal(shouldOfferMistakeHelp(1, 2, false), false);
    assert.equal(shouldOfferMistakeHelp(2, 3, false), true);
    assert.equal(shouldOfferMistakeHelp(3, 4, false), false);
    assert.equal(shouldOfferMistakeHelp(2, 3, true), false);
  });

  it("breathes subtly and expires automatically", () => {
    const middle = mistakeHelpPulse(MISTAKE_HELP_DURATION_MS / 2);
    assert.equal(middle.active, true);
    assert.ok(middle.scale >= 1 && middle.scale <= 1.055);
    assert.ok(middle.glow > 0);
    assert.deepEqual(mistakeHelpPulse(MISTAKE_HELP_DURATION_MS), { active: false, scale: 1, glow: 0 });
  });
});
