import type { Settings } from "../types";

/** A session owns only preview timing; it never receives the real board. */
export class HintSession {
  stage = 0;
  startedAt: number;
  private pendingNext = false;
  readonly transitionDuration = 300;
  readonly readingDuration: number;

  constructor(readonly count: number, readonly mode: Settings["hintMode"], now: number) {
    this.startedAt = now;
    if (mode === "direct") this.stage = count - 1;
    this.readingDuration = count === 4 ? 1350 : 1450;
  }

  next(now: number, animated: boolean): void {
    if (this.stage >= this.count - 1) return;
    if (animated && now - this.startedAt < this.transitionDuration) {
      this.pendingNext = true;
      return;
    }
    this.stage++;
    this.startedAt = now;
    this.pendingNext = false;
  }

  previous(now: number): void {
    if (this.mode === "direct") return;
    this.stage = Math.max(0, this.stage - 1);
    this.startedAt = now;
    this.pendingNext = false;
  }

  frame(now: number, animated: boolean, targets: number) {
    const elapsed = Math.max(0, now - this.startedAt);
    const transition = animated ? this.transitionDuration : 0;
    if ((this.pendingNext && elapsed >= transition) ||
      (this.mode === "auto" && elapsed >= transition + this.readingDuration)) {
      this.next(now, animated);
    }
    const age = Math.max(0, now - this.startedAt);
    const final = this.stage === this.count - 1;
    const stagger = this.mode === "auto" ? 120 : Math.min(30, 100 / Math.max(1, targets - 1));
    const duration = this.mode === "auto" ? 280 : 300;
    const progress = (index: number) => !final ? 0 : !animated ? 1
      : Math.max(0, Math.min(1, (age - index * stagger) / duration));
    return {
      stage: this.stage, progress,
      // One smooth 1.4s cycle, scoped to this preview and its visible results.
      resultEmphasis: (index: number) => index < 0 || index >= targets || progress(index) <= 0 ? null
        : animated ? (1 - Math.cos(Math.max(0, age - index * stagger) / 1400 * Math.PI * 2)) / 2 : 0.5,
      transition: animated ? Math.min(1, age / this.transitionDuration) : 1,
      complete: final && (targets === 0 || progress(targets - 1) === 1),
    };
  }
}
