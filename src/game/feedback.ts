import type { Settings } from "../types";

export type GameSound = "click" | "mark" | "cat" | "wrong" | "win";
export type Milestone = "none" | "small" | "large";

export function milestoneFor(ordinal: number): Milestone {
  if (ordinal <= 0) return "none";
  if (ordinal % 100 === 0) return "large";
  if (ordinal === 25 || ordinal % 50 === 0) return "small";
  return "none";
}

const notes: Record<GameSound, number[]> = {
  click: [480],
  mark: [680],
  cat: [660, 880],
  wrong: [180, 130],
  win: [523, 659, 784, 1047],
};

class SoundManager {
  private context?: WxAudioContextLike;
  private musicTimer?: ReturnType<typeof setInterval>;
  private melodyIndex = 0;

  private getContext(): WxAudioContextLike | undefined {
    try {
      this.context ??= wx.createWebAudioContext?.();
      this.context?.resume?.();
      return this.context;
    } catch {
      return undefined;
    }
  }

  private note(frequency: number, start = 0, duration = 0.12, volume = 0.04): void {
    const context = this.getContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const at = context.currentTime + start;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  }

  play(name: GameSound, settings: Settings): void {
    if (!settings.soundEnabled) return;
    notes[name].forEach((frequency, index) => {
      this.note(frequency, index * 0.095, name === "win" ? 0.3 : 0.12);
    });
  }

  setMusic(enabled: boolean): void {
    if (!enabled) {
      if (this.musicTimer !== undefined) clearInterval(this.musicTimer);
      this.musicTimer = undefined;
      return;
    }
    if (!this.getContext() || this.musicTimer !== undefined) return;
    const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
    this.musicTimer = setInterval(() => {
      this.note(melody[this.melodyIndex++ % melody.length]!, 0, 0.8, 0.01);
    }, 900);
  }
}

export const sound = new SoundManager();
