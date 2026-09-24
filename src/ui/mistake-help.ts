export const MISTAKE_HELP_THRESHOLD = 3;
export const MISTAKE_HELP_DURATION_MS = 1_800;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function shouldOfferMistakeHelp(
  mistakesBefore: number,
  mistakesAfter: number,
  hasShown: boolean,
): boolean {
  return !hasShown && mistakesBefore < MISTAKE_HELP_THRESHOLD && mistakesAfter >= MISTAKE_HELP_THRESHOLD;
}

export function mistakeHelpPulse(elapsedMs: number): { active: boolean; scale: number; glow: number } {
  const progress = clamp01(elapsedMs / MISTAKE_HELP_DURATION_MS);
  if (elapsedMs < 0 || progress >= 1) return { active: false, scale: 1, glow: 0 };
  const envelope = Math.sin(progress * Math.PI);
  const breath = 0.5 + 0.5 * Math.sin(progress * Math.PI * 6);
  return {
    active: true,
    scale: 1 + 0.055 * envelope * breath,
    glow: envelope * (0.45 + 0.35 * breath),
  };
}
