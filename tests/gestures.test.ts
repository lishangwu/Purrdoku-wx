import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GestureMachine, TAP_MS, type GestureAction } from "../src/game/gestures";

function mockClock() {
  let queued: { at: number; fn: () => void }[] = [];
  let t = 0;
  return {
    now: () => t,
    later(ms: number, fn: () => void) {
      const at = t + ms;
      queued.push({ at, fn });
      return () => {
        queued = queued.filter((item) => item.fn !== fn);
      };
    },
    flush(ms: number) {
      t += ms;
      const due = queued.filter((item) => item.at <= t);
      queued = queued.filter((item) => item.at > t);
      due.forEach((item) => item.fn());
    },
  };
}

describe("gestures", () => {
  it("emits a toggle 220ms after a single tap", () => {
    const actions: GestureAction[] = [];
    const clock = mockClock();
    const g = new GestureMachine(clock, (a) => actions.push(a));
    g.start(4, 1);
    g.end(1);
    assert.equal(actions.length, 0);
    clock.flush(TAP_MS);
    assert.deepEqual(actions, [{ type: "toggle", index: 4 }]);
  });

  it("treats a second tap on the same cell as placing a cat", () => {
    const actions: GestureAction[] = [];
    const clock = mockClock();
    const g = new GestureMachine(clock, (a) => actions.push(a));
    g.start(4, 1);
    g.end(1);
    g.start(4, 1);
    g.end(1);
    assert.deepEqual(actions, [{ type: "place", index: 4 }]);
    clock.flush(TAP_MS);
    assert.equal(actions.length, 1);
  });

  it("commits the previous tap when a different cell is pressed quickly", () => {
    const actions: GestureAction[] = [];
    const clock = mockClock();
    const g = new GestureMachine(clock, (a) => actions.push(a));
    g.start(1, 1);
    g.end(1);
    g.start(2, 1);
    assert.deepEqual(actions, [{ type: "toggle", index: 1 }]);
    g.end(1);
    clock.flush(TAP_MS);
    assert.deepEqual(actions[1], { type: "toggle", index: 2 });
  });

  it("turns a cell change into a drag and does not toggle", () => {
    const actions: GestureAction[] = [];
    const clock = mockClock();
    const g = new GestureMachine(clock, (a) => actions.push(a));
    g.start(0, 1, 0, 0, 4);
    g.move(3, 1, 30, 1);
    g.end(1);
    assert.deepEqual(actions.at(-1), { type: "drag", path: [0, 1, 2, 3] });
    clock.flush(TAP_MS);
    assert.ok(actions.every((a) => a.type !== "toggle"));
  });

  it("locks the first direction despite perpendicular finger drift", () => {
    const actions: GestureAction[] = [];
    const clock = mockClock();
    const g = new GestureMachine(clock, (a) => actions.push(a));
    g.start(0, 1, 0, 0, 3);
    g.move(2, 1, 20, 1);
    g.move(8, 1, 28, 30);
    g.end(1);
    assert.deepEqual(actions.at(-1), { type: "drag", path: [0, 1, 2] });
  });

  it("waits for the movement threshold before becoming a drag", () => {
    const actions: GestureAction[] = [];
    const clock = mockClock();
    const g = new GestureMachine(clock, (a) => actions.push(a));
    g.start(4, 1, 20, 20, 3);
    g.move(5, 1, 25, 22);
    g.end(1);
    clock.flush(TAP_MS);
    assert.deepEqual(actions, [{ type: "toggle", index: 4 }]);
  });

  it("fills skipped cells on a fast vertical swipe and visits each once", () => {
    const actions: GestureAction[] = [];
    const clock = mockClock();
    const g = new GestureMachine(clock, (a) => actions.push(a));
    g.start(1, 1, 10, 0, 4);
    g.move(13, 1, 11, 40);
    g.move(13, 1, 12, 44);
    g.end(1);
    assert.deepEqual(actions.at(-1), { type: "drag", path: [1, 5, 9, 13] });
    assert.equal(actions.filter((action) => action.type === "preview").length, 1);
  });

  it("ignores move and end events from another touch", () => {
    const actions: GestureAction[] = [];
    const clock = mockClock();
    const g = new GestureMachine(clock, (a) => actions.push(a));
    g.start(4, 7);
    g.move(5, 8);
    g.end(8);
    clock.flush(TAP_MS);
    assert.deepEqual(actions, []);
    g.end(7);
    clock.flush(TAP_MS);
    assert.deepEqual(actions, [{ type: "toggle", index: 4 }]);
  });

  it("cancels only the matching active touch", () => {
    const actions: GestureAction[] = [];
    const clock = mockClock();
    const g = new GestureMachine(clock, (a) => actions.push(a));
    g.start(4, 7);
    g.cancel(8);
    g.end(7);
    clock.flush(TAP_MS);
    assert.deepEqual(actions, [{ type: "toggle", index: 4 }]);
  });
});
