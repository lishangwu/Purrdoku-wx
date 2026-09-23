import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dailyIndex, localDate } from "../src/game/daily";
import { dailyRecordKey } from "../src/game/storage";
import { miniLevel } from "./helpers";

describe("daily challenge", () => {
  it("picks a stable index from the local date string", () => {
    assert.equal(dailyIndex("2026-09-17", 10), dailyIndex("2026-09-17", 10));
    assert.notEqual(dailyIndex("2026-09-17", 10), dailyIndex("2026-09-18", 10));
    assert.ok(dailyIndex("2026-09-17", 10) >= 0);
    assert.ok(dailyIndex("2026-09-17", 10) < 10);
  });

  it("formats local dates as YYYY-MM-DD", () => {
    assert.equal(localDate(new Date(2026, 8, 17)), "2026-09-17");
  });

  it("keeps saving an open daily game under its original date", () => {
    const level = { ...miniLevel(), id: "daily-2026-09-22" };
    assert.equal(dailyRecordKey({ level }, "daily-2026-09-23"), "daily-2026-09-22");
  });
});
