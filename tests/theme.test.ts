import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { theme } from "../src/ui/theme";

describe("H5 theme tokens", () => {
  it("uses the cozy lavender paper and accent from H5", () => {
    assert.equal(theme.paper, "#f4f8fc");
    assert.equal(theme.ink, "#293b52");
    assert.equal(theme.accent, "#8073f5");
    assert.equal(theme.regions[0], "#8976d8");
    assert.equal(theme.regions[5], "#a76c49");
  });
});
