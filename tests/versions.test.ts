import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CURRENT_VERSIONS, tagGeneratedLevel } from "../src/engine/versions";
import { miniLevel } from "./helpers";

describe("generation versions", () => {
  it("records generator, pacer and purpose on a generated level", () => {
    const level = tagGeneratedLevel(miniLevel(), "challenge");
    assert.deepEqual(level.generation, {
      generatorVersion: CURRENT_VERSIONS.generator,
      pacerVersion: CURRENT_VERSIONS.pacer,
      purpose: "challenge",
    });
  });
});
