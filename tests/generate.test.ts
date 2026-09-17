import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generatePuzzle } from "../src/engine/generate";
import { uniqueSolution } from "../src/engine/search";
import { logicalSolve } from "../src/engine/logic";
import { validStructure } from "../src/engine/structure";

describe("puzzle generator", () => {
  it("builds a unique 6x6 logic puzzle for a fixed seed", () => {
    const level = generatePuzzle({
      seed: "purrdoku-test-open",
      size: 6,
      scoreMin: 0,
      scoreMax: 30,
      combinations: false,
      easyGeometry: true,
      maxF: 3,
      maxR: 4,
      maxCandidates: 120,
    });
    assert.ok(level, "generator returned no puzzle");
    assert.equal(validStructure(level!), true);
    const unique = uniqueSolution(level!, 20_000);
    assert.equal(unique.status, "complete");
    assert.equal(unique.solutions.length, 1);
    assert.equal(logicalSolve(level!, false, 200_000).status, "solved");
    assert.equal(level!.size, 6);
  });
});
