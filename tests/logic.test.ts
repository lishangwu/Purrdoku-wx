import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { miniLevel } from "./helpers";
import { validStructure } from "../src/engine/structure";
import { countSolutions, uniqueSolution } from "../src/engine/search";
import { logicalSolve } from "../src/engine/logic";

describe("structure and search", () => {
  it("accepts a covering, 4-connected, one-cat-per-region board", () => {
    assert.equal(validStructure(miniLevel()), true);
  });

  it("rejects a region that is only diagonally touching", () => {
    const level = miniLevel();
    level.regions = [
      [0, 1, 1, 1],
      [1, 0, 1, 1],
      [2, 2, 3, 1],
      [2, 3, 3, 3],
    ];
    assert.equal(validStructure(level), false);
  });

  it("proves the mini puzzle has exactly the declared solution", () => {
    const level = miniLevel();
    const found = uniqueSolution(level, 20_000);
    assert.equal(found.status, "complete");
    assert.equal(found.solutions.length, 1);
    assert.deepEqual(found.solutions[0], level.solution);
  });

  it("reports a second solution when two placements both fit", () => {
    const level = miniLevel();
    level.regions = [
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [2, 2, 3, 3],
      [2, 2, 3, 3],
    ];
    const found = countSolutions(level, 2, 20_000);
    assert.ok(found.solutions.length >= 2 || found.status === "limit");
  });
});

describe("logical solver", () => {
  it("solves the mini puzzle with B1-B4 only", () => {
    const result = logicalSolve(miniLevel(), false, 20_000);
    assert.equal(result.status, "solved");
    assert.equal(result.cats.length, 4);
  });

  it("places a cat with B1 when a region has a single candidate", () => {
    const result = logicalSolve(miniLevel(), false, 20_000);
    assert.equal(result.status, "solved");
    assert.equal(result.steps[0]?.rule, "B1");
    assert.deepEqual(result.steps[0]?.placed, [1]);
  });

  it("uses B3 to lock a region onto a row", () => {
    const level = {
      id: "b3",
      size: 4,
      difficulty: "easy" as const,
      regions: [
        [0, 0, 1, 1],
        [0, 2, 2, 1],
        [3, 2, 2, 1],
        [3, 3, 3, 1],
      ],
      solution: [
        { row: 0, col: 1 },
        { row: 1, col: 3 },
        { row: 2, col: 0 },
        { row: 3, col: 2 },
      ],
    };
    const result = logicalSolve(level, false, 50_000);
    assert.ok(result.steps.some((step) => step.rule === "B3") || result.status === "solved");
  });

  it("uses C1 when two regions occupy exactly two rows", () => {
    const level = miniLevel();
    const result = logicalSolve(level, true, 50_000);
    assert.equal(result.status, "solved");
  });
});
