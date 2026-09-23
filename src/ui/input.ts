import { hit, type Rect } from "./theme";

export interface PressTarget {
  id: string;
  rect: Rect;
}

export interface PressState {
  id: string;
  touchId: number;
}

function targetAt(targets: PressTarget[], x: number, y: number): PressTarget | undefined {
  return [...targets].reverse().find((target) => hit(target.rect, x, y));
}

export function beginPress(
  targets: PressTarget[],
  x: number,
  y: number,
  touchId: number,
): PressState | null {
  const target = targetAt(targets, x, y);
  return target ? { id: target.id, touchId } : null;
}

export function keepPress(
  press: PressState | null,
  targets: PressTarget[],
  x: number,
  y: number,
  touchId: number,
): PressState | null {
  if (!press || press.touchId !== touchId) return press;
  const target = targetAt(targets, x, y);
  return target?.id === press.id ? press : null;
}

export function releasePress(
  press: PressState | null,
  targets: PressTarget[],
  x: number,
  y: number,
  touchId: number,
): string | null {
  if (!press || press.touchId !== touchId) return null;
  const target = targetAt(targets, x, y);
  return target?.id === press.id ? press.id : null;
}
