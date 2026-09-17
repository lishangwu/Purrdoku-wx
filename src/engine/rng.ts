export class Rng {
  constructor(private s: number) {
    if (this.s === 0) this.s = 2166136261;
  }

  next(): number {
    this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
    return this.s / 4294967296;
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  pick<T>(items: T[]): T {
    return items[this.int(items.length)];
  }

  shuffle<T>(items: T[]): T[] {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  weighted<T extends { w: number }>(items: T[]): T | null {
    const total = items.reduce((sum, item) => sum + item.w, 0);
    if (total <= 0) return null;
    let needle = this.next() * total;
    for (const item of items) {
      needle -= item.w;
      if (needle <= 0) return item;
    }
    return items[items.length - 1];
  }
}

export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  }
  return hash || 1;
}

export function rngFrom(text: string): Rng {
  return new Rng(hashSeed(text));
}
