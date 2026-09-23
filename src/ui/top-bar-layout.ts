export interface PlayTopBarLayout {
  controlsY: number;
  settingsY: number;
  statusY: number;
  contentY: number;
}

export function playTopBarLayout(frameY: number, menuBottom: number | null): PlayTopBarLayout {
  const controlsY = frameY + 2;
  const settingsY = menuBottom === null ? controlsY : Math.max(controlsY, menuBottom + 8);
  return {
    controlsY,
    settingsY,
    statusY: frameY + 54,
    contentY: Math.max(frameY + 70, settingsY + 48),
  };
}
