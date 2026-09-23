export const TAP_MS = 220;

export type GestureAction =
  | { type: "toggle"; index: number }
  | { type: "place"; index: number }
  | { type: "drag"; from: number; to: number }
  | { type: "preview"; from: number; to: number };

export interface GestureClock {
  later(ms: number, fn: () => void): () => void;
}

export class GestureMachine {
  private touchId: number | null = null;
  private startCell = -1;
  private lastCell = -1;
  private dragging = false;
  private secondTap = false;
  private awaitingSecond = false;
  private pendingCell = -1;
  private cancelTimer: (() => void) | null = null;

  constructor(
    private clock: GestureClock,
    private emit: (action: GestureAction) => void,
  ) {}

  start(cell: number, touchId: number): void {
    if (this.touchId !== null) return;
    this.touchId = touchId;
    this.startCell = cell;
    this.lastCell = cell;
    this.dragging = false;
    if (this.awaitingSecond && this.pendingCell === cell) {
      this.clearTimer();
      this.awaitingSecond = false;
      this.secondTap = true;
      return;
    }
    if (this.awaitingSecond) this.flushToggle();
    this.secondTap = false;
  }

  move(cell: number, touchId: number): void {
    if (this.touchId !== touchId || cell === this.lastCell) return;
    this.dragging = true;
    this.secondTap = false;
    this.clearTimer();
    this.awaitingSecond = false;
    this.lastCell = cell;
    this.emit({ type: "preview", from: this.startCell, to: cell });
  }

  end(touchId: number): void {
    if (this.touchId !== touchId) return;
    this.touchId = null;
    if (this.dragging) {
      this.emit({ type: "drag", from: this.startCell, to: this.lastCell });
      this.dragging = false;
      return;
    }
    if (this.secondTap) {
      this.emit({ type: "place", index: this.startCell });
      this.secondTap = false;
      return;
    }
    this.pendingCell = this.startCell;
    this.awaitingSecond = true;
    this.cancelTimer = this.clock.later(TAP_MS, () => this.flushToggle());
  }

  cancel(touchId?: number): void {
    if (touchId !== undefined && this.touchId !== touchId) return;
    this.touchId = null;
    this.dragging = false;
    this.secondTap = false;
    this.awaitingSecond = false;
    this.clearTimer();
  }

  private flushToggle(): void {
    this.clearTimer();
    if (!this.awaitingSecond) return;
    this.awaitingSecond = false;
    this.emit({ type: "toggle", index: this.pendingCell });
  }

  private clearTimer(): void {
    this.cancelTimer?.();
    this.cancelTimer = null;
  }
}
