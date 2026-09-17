import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planLevel } from "../src/engine/pacer";
import { Rng } from "../src/engine/rng";

describe("difficulty pacer", () => {
  it("keeps the first ten levels on 6x6 without C1", () => {
    const rng = new Rng(1);
    for (let n = 1; n <= 10; n++) {
      const plan = planLevel(n, [], { 6: n - 1 }, rng);
      assert.equal(plan.size, 6);
      assert.equal(plan.combinations, false);
      assert.equal(plan.teaching, true);
    }
  });

  it("forces a relax level after three scores of 60+", () => {
    const history = [61, 70, 66].map((score) => ({
      score,
      purpose: "normal" as const,
      size: 8,
      signature: `s${score}`,
    }));
    const plan = planLevel(80, history, { 6: 10, 7: 20, 8: 40 }, new Rng(9));
    assert.equal(plan.purpose, "relax");
    assert.ok(plan.hardCap <= 34);
  });

  it("blocks a third 9x9 in a row", () => {
    const history = [
      { score: 40, purpose: "normal" as const, size: 9, signature: "a" },
      { score: 42, purpose: "normal" as const, size: 9, signature: "b" },
    ];
    for (let seed = 1; seed < 40; seed++) {
      const plan = planLevel(160, history, { 6: 10, 7: 20, 8: 80, 9: 40 }, new Rng(seed));
      assert.notEqual(plan.size, 9);
    }
  });
});
