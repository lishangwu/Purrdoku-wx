import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PuzzleQueue } from "../src/game/puzzle-queue";

describe("puzzle queue", () => {
  it("deduplicates the same pending request", async () => {
    const tasks: (() => void)[] = [];
    const queue = new PuzzleQueue<number>((task) => tasks.push(task));
    let runs = 0;
    const first = queue.prepare("same", () => ++runs);
    const second = queue.prepare("same", () => ++runs);
    assert.equal(first, second);
    tasks.shift()!();
    assert.equal(await first, 1);
    assert.equal(runs, 1);
  });

  it("invalidates an old request and allows a higher-budget retry", async () => {
    const tasks: (() => void)[] = [];
    const queue = new PuzzleQueue<string>((task) => tasks.push(task));
    const old = queue.prepare("budget-80", () => "old");
    queue.clear();
    const retry = queue.prepare("budget-800", () => "ready");
    tasks.shift()!();
    await assert.rejects(old, /取消/);
    tasks.shift()!();
    assert.equal(await retry, "ready");
  });

  it("rejects instead of substituting a puzzle when constraints are unmet", async () => {
    const tasks: (() => void)[] = [];
    const queue = new PuzzleQueue<string>((task) => tasks.push(task));
    const result = queue.prepare("strict", () => null);
    tasks.shift()!();
    await assert.rejects(result, /当前约束/);
  });
});
