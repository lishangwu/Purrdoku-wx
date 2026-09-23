import { it } from "node:test";
import assert from "node:assert/strict";
import { HintSession } from "../src/ui/hint-session";
import { defaultSettings } from "../src/types";
import { readJson, writeJson, SAVE_KEY, type ShellSave } from "../src/game/storage";

for (const count of [3, 4]) {
  it(`${count} interactive steps wait, go back, and keep the final result`, () => {
    const session = new HintSession(count, "interactive", 0);
    assert.equal(session.frame(100000, true, 81).stage, 0);
    for (let stage = 1; stage < count; stage++) session.next(stage * 1000, true);
    assert.equal(session.frame(count * 1000, true, 81).complete, true);
    assert.equal(session.frame(999999, true, 81).stage, count - 1);
    session.previous(1000000);
    assert.equal(session.frame(1001000, true, 81).progress(0), 0);
    session.next(1002000, true);
    assert.equal(session.frame(1002400, true, 81).complete, true);
    assert.equal(new HintSession(count, "interactive", 1002400).stage, 0);
  });

  it(`${count} auto steps reserve reading time and allow a queued skip`, () => {
    const session = new HintSession(count, "auto", 0);
    const interval = 300 + (count === 4 ? 1350 : 1450);
    assert.equal(session.frame(interval - 1, true, 4).stage, 0);
    assert.equal(session.frame(interval, true, 4).stage, 1);
    session.next(interval + 10, true);
    assert.equal(session.frame(interval + 299, true, 4).stage, 1);
    assert.equal(session.frame(interval + 300, true, 4).stage, 2);
    if (count === 4) session.next(interval + 600, true);
    const started = session.startedAt;
    assert.equal(session.frame(started + 280, true, 4).progress(0), 1);
    assert.equal(session.frame(started + 280, true, 4).complete, false);
    assert.equal(session.frame(started + 640, true, 4).complete, true);
    assert.equal(session.frame(started + 99999, true, 4).complete, true);
    assert.equal(session.startedAt, started);
  });
}

it("disabling animation does not skip interactive teaching", () => {
  const session = new HintSession(3, "interactive", 0);
  assert.equal(session.frame(10000, false, 1).stage, 0);
  session.next(10000, false);
  session.next(10000, false);
  assert.equal(session.frame(10000, false, 1).complete, true);
  session.previous(10000);
  assert.equal(session.frame(10000, false, 1).progress(0), 0);
});

it("persists hint mode and defaults older saves to interactive", () => {
  let saved: unknown;
  const store = { get: () => saved, set: (_key: string, value: unknown) => { saved = value; } };
  for (const mode of ["interactive", "auto", "direct"] as const) {
    writeJson(store, SAVE_KEY, { settings: { ...defaultSettings(), hintMode: mode }, daily: {} });
    assert.equal(readJson<ShellSave>(store, SAVE_KEY, {} as ShellSave).settings.hintMode, mode);
  }
  saved = { settings: { soundEnabled: false }, daily: {} };
  const raw = readJson<Partial<ShellSave>>(store, SAVE_KEY, {});
  assert.equal(({ ...defaultSettings(), ...raw.settings }).hintMode, "interactive");
});

it("direct mode skips teaching, reveals all results within 400ms, and stays still", () => {
  for (const targets of [1, 4, 81]) {
    const session = new HintSession(4, "direct", 1000);
    assert.equal(session.frame(1000, true, targets).stage, 3);
    assert.equal(session.frame(1000, true, targets).complete, false);
    assert.equal(session.frame(1400, true, targets).complete, true);
    session.previous(1500);
    session.next(1600, true);
    assert.equal(session.frame(100000, true, targets).progress(targets - 1), 1);
    assert.equal(session.startedAt, 1000);
    assert.equal(new HintSession(1, "direct", 0).frame(0, false, targets).complete, true);
  }
});

it("breathes only visible results, resets on back/reopen, and respects reduced motion", () => {
  for (const mode of ["interactive", "auto", "direct"] as const) {
    const session = new HintSession(3, mode, 0);
    if (mode !== "direct") {
      assert.equal(session.frame(100, true, 2).resultEmphasis(0), null);
      session.next(400, true);
      session.next(800, true);
    }
    const start = session.startedAt;
    assert.equal(session.frame(start + 700, true, 2).resultEmphasis(0), 1);
    assert.equal(session.frame(start + 1400, true, 2).resultEmphasis(0), 0);
    assert.equal(session.frame(start + 2100, true, 2).resultEmphasis(0), 1);
    assert.equal(session.frame(start + 2100, true, 2).resultEmphasis(-1), null);
    assert.equal(session.frame(start + 2100, true, 2).resultEmphasis(2), null);
    assert.equal(session.frame(start + 2200, false, 2).resultEmphasis(0), 0.5);
    assert.equal(session.frame(start + 2900, false, 2).resultEmphasis(0), 0.5);
    if (mode === "interactive") {
      session.previous(start + 3000);
      assert.equal(session.frame(start + 3100, true, 2).resultEmphasis(0), null);
    }
    assert.equal(new HintSession(3, mode, 5000).frame(5000, true, 2).resultEmphasis(0), null);
  }
});
