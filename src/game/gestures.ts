export const TAP_MS = 220;
export const DRAG_THRESHOLD_PX = 8;

export type GestureAction =
  | { type: "toggle"; index: number }
  | { type: "place"; index: number }
  | { type: "drag"; path: number[] }
  | { type: "preview"; path: number[] };

export interface GestureClock {
  later(ms: number, fn: () => void): () => void;
}

export class GestureMachine {
  private touchId: number | null = null;
  private startCell = -1;
  private lastCell = -1;
  private boardSize = 1;
  private startX = 0;
  private startY = 0;
  private path: number[] = [];
  private visited = new Set<number>();
  private dragging = false;
  private secondTap = false;
  private awaitingSecond = false;
  private pendingCell = -1;
  private cancelTimer: (() => void) | null = null;

  constructor(private clock: GestureClock, private emit: (action: GestureAction) => void) {}

  start(cell: number, touchId: number, x = 0, y = 0, boardSize = 1): void {
    if (this.touchId !== null) return;
    this.touchId = touchId;
    this.startCell = cell;
    this.lastCell = cell;
    this.boardSize = Math.max(1, boardSize);
    this.startX = x;
    this.startY = y;
    this.path = [cell];
    this.visited = new Set([cell]);
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

  move(cell: number, touchId: number, x = 0, y = 0): void {
    if (this.touchId !== touchId) return;
    if (!this.dragging) {
      const dx = x - this.startX;
      const dy = y - this.startY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_THRESHOLD_PX) return;
      this.dragging = true;
      this.secondTap = false;
      this.clearTimer();
      this.awaitingSecond = false;
    }

    if (cell === this.lastCell) return;

    const lastRow = Math.floor(this.lastCell / this.boardSize);
    const lastCol = this.lastCell % this.boardSize;
    const targetRow = Math.floor(cell / this.boardSize);
    const targetCol = cell % this.boardSize;
    const steps = Math.max(Math.abs(targetRow - lastRow), Math.abs(targetCol - lastCol));
    for (let step = 1; step <= steps; step++) {
      const row = Math.round(lastRow + ((targetRow - lastRow) * step) / steps);
      const col = Math.round(lastCol + ((targetCol - lastCol) * step) / steps);
      const index = row * this.boardSize + col;
      if (!this.visited.has(index)) {
        this.visited.add(index);
        this.path.push(index);
      }
    }
    this.lastCell = cell;
    this.emit({ type: "preview", path: this.path.slice() });
  }

  end(touchId: number): void {
    if (this.touchId !== touchId) return;
    this.touchId = null;
    if (this.dragging) {
      this.emit({ type: "drag", path: this.path.slice() });
      this.resetDrag();
      return;
    }
    if (this.secondTap) {
      this.emit({ type: "place", index: this.startCell });
      this.secondTap = false;
      this.resetDrag();
      return;
    }
    this.pendingCell = this.startCell;
    this.awaitingSecond = true;
    this.resetDrag();
    this.cancelTimer = this.clock.later(TAP_MS, () => this.flushToggle());
  }

  cancel(touchId?: number): void {
    if (touchId !== undefined && this.touchId !== touchId) return;
    this.touchId = null;
    this.secondTap = false;
    this.awaitingSecond = false;
    this.resetDrag();
    this.clearTimer();
  }

  private resetDrag(): void {
    this.dragging = false;
    this.lastCell = -1;
    this.path = [];
    this.visited.clear();
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
