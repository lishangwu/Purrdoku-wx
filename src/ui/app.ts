import { generatePuzzle, type GenerateRequest } from "../engine/generate";
import { planLevel, type PaceHistory } from "../engine/pacer";
import { hashSeed, rngFrom } from "../engine/rng";
import { markLine, starsFor } from "../engine/board";
import { staticLevels } from "../data/static";
import {
  applyHint,
  createPlay,
  dragMark,
  noteHintShown,
  peekHint,
  placeOn,
  restart,
  resultOf,
  tick as tickPlay,
  toggleCell,
  undo,
  type PlayState,
} from "../game/play";
import { dailyIndex, dailyKey, localDate } from "../game/daily";
import { GestureMachine } from "../game/gestures";
import {
  INFINITE_KEY,
  SAVE_KEY,
  readJson,
  wxStore,
  writeJson,
  type DailyRecord,
  type InfiniteSave,
  type ShellSave,
} from "../game/storage";
import type { Env } from "../platform/env";
import { fit } from "../platform/env";
import {
  card,
  drawCat,
  drawMark,
  drawMiniCat,
  drawPaw,
  paintPaper,
  wrapText,
} from "./paint";
import {
  difficultyName,
  fillRound,
  hit,
  strokeRound,
  theme,
  type Rect,
} from "./theme";
import { defaultSettings, type HintPlan, type Settings } from "../types";

type Scene = "home" | "play";
type Modal =
  | null
  | "settings"
  | "help"
  | "rules"
  | "hint"
  | "result"
  | "restart"
  | "clear";
type Mode = "infinite" | "daily";

interface HitTarget {
  id: string;
  rect: Rect;
}

const store = wxStore();

function isPlay(value: unknown): value is PlayState {
  if (!value || typeof value !== "object") return false;
  const play = value as PlayState;
  return Boolean(
    play.level?.size &&
      Array.isArray(play.level.regions) &&
      Array.isArray(play.board) &&
      play.board.length === play.level.size * play.level.size,
  );
}

function loadShell(): ShellSave {
  const raw = readJson<Partial<ShellSave>>(store, SAVE_KEY, { settings: defaultSettings(), daily: {} });
  return {
    settings: { ...defaultSettings(), ...(raw.settings ?? {}) },
    daily: raw.daily && typeof raw.daily === "object" ? raw.daily : {},
  };
}

function loadInfinite(): InfiniteSave {
  const raw = readJson<Partial<InfiniteSave>>(store, INFINITE_KEY, {
    playerSeed: newSeed(),
    ordinal: 0,
    play: null,
    stats: { completed: 0, independent: 0, flawless: 0 },
    history: [],
    sizeCounts: { 6: 0, 7: 0, 8: 0, 9: 0 },
  });
  return {
    playerSeed: typeof raw.playerSeed === "string" ? raw.playerSeed : newSeed(),
    ordinal: typeof raw.ordinal === "number" ? raw.ordinal : 0,
    play: isPlay(raw.play) ? raw.play : null,
    stats: {
      completed: raw.stats?.completed ?? 0,
      independent: raw.stats?.independent ?? 0,
      flawless: raw.stats?.flawless ?? 0,
    },
    history: Array.isArray(raw.history) ? raw.history : [],
    sizeCounts: { 6: 0, 7: 0, 8: 0, 9: 0, ...(raw.sizeCounts ?? {}) },
  };
}

function newSeed(): string {
  return `purr-${Date.now().toString(36)}`;
}

export function createApp(env: Env) {
  let shell = loadShell();
  let settings: Settings = shell.settings;
  let infinite = loadInfinite();

  let scene: Scene = "home";
  let modal: Modal = null;
  let mode: Mode = "infinite";
  let play: PlayState | null = infinite.play;
  let hint: HintPlan | null = null;
  let lastTs = 0;
  let visible = true;
  let focus = 0;
  let hits: HitTarget[] = [];
  let boardRect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  let previewDrag: { from: number; to: number } | null = null;
  let toast = "";

  const gestures = new GestureMachine(
    {
      later(ms, fn) {
        const id = setTimeout(fn, ms);
        return () => clearTimeout(id);
      },
    },
    (action) => {
      if (!play || modal) return;
      if (action.type === "toggle") toggleCell(play, action.index);
      if (action.type === "place") {
        placeOn(play, action.index);
        if (play.completed) onWin();
        buzz();
      }
      if (action.type === "drag") {
        dragMark(play, action.from, action.to);
        previewDrag = null;
      }
      if (action.type === "preview") previewDrag = { from: action.from, to: action.to };
      persist();
    },
  );

  function persist(): void {
    shell.settings = settings;
    if (mode === "daily" && play) {
      const key = dailyKey();
      const prev = shell.daily[key];
      shell.daily[key] = {
        play,
        bestStars: Math.max(prev?.bestStars ?? 0, play.completed ? starsFor(play.mistakes) : prev?.bestStars ?? 0),
        bestTime: play.completed
          ? Math.min(prev?.bestTime || 1e9, play.elapsed)
          : prev?.bestTime ?? 0,
      } satisfies DailyRecord;
    }
    writeJson(store, SAVE_KEY, shell);
    infinite.play = mode === "infinite" ? play : infinite.play;
    writeJson(store, INFINITE_KEY, infinite);
  }

  function buzz(): void {
    if (settings.hapticEnabled) wx.vibrateShort?.({ type: "light" });
  }

  function makePuzzle(req: GenerateRequest) {
    return generatePuzzle(req);
  }

  function openingLevel() {
    return staticLevels[hashSeed(infinite.playerSeed) % staticLevels.length];
  }

  function startInfinite(): void {
    mode = "infinite";
    scene = "play";
    modal = null;
    if (infinite.play) {
      play = infinite.play;
      play.settings = settings;
      if (play.completed) modal = "result";
      persist();
      return;
    }
    const ordinal = infinite.ordinal > 0 ? infinite.ordinal : 1;
    const plan = planLevel(
      ordinal,
      infinite.history,
      infinite.sizeCounts,
      rngFrom(`${infinite.playerSeed}|${ordinal}`),
    );
    const generated =
      ordinal <= 5
        ? openingLevel()
        : makePuzzle({
            seed: `${infinite.playerSeed}|${ordinal}|v5`,
            size: plan.size,
            scoreMin: plan.scoreMin,
            scoreMax: plan.scoreMax,
            combinations: plan.combinations,
            easyGeometry: plan.easyGeometry,
            hardCap: plan.hardCap,
            maxF: plan.maxF,
            maxR: plan.maxR,
            recentSignatures: infinite.history.map((h) => h.signature),
            maxCandidates: 80,
          }) || openingLevel();
    infinite.ordinal = ordinal;
    infinite.sizeCounts[generated.size] = (infinite.sizeCounts[generated.size] ?? 0) + 1;
    play = createPlay(
      { ...generated, source: ordinal <= 5 ? "opening" : generated.source },
      settings,
    );
    persist();
  }

  function startDaily(): void {
    mode = "daily";
    scene = "play";
    const key = dailyKey();
    const rec = shell.daily[key];
    if (rec?.play) {
      play = rec.play;
      play.settings = settings;
      modal = play.completed ? "result" : null;
      persist();
      return;
    }
    const level = staticLevels[dailyIndex(localDate(), staticLevels.length)];
    play = createPlay({ ...level, id: key, difficulty: "easy" }, settings);
    modal = null;
    persist();
  }

  function nextInfinite(): void {
    if (!play) return;
    infinite.ordinal += 1;
    const plan = planLevel(
      infinite.ordinal,
      infinite.history,
      infinite.sizeCounts,
      rngFrom(`${infinite.playerSeed}|${infinite.ordinal}`),
    );
    toast = "正在印下一张…";
    const generated =
      makePuzzle({
        seed: `${infinite.playerSeed}|${infinite.ordinal}|v5`,
        size: plan.size,
        scoreMin: plan.scoreMin,
        scoreMax: plan.scoreMax,
        combinations: plan.combinations,
        easyGeometry: plan.easyGeometry,
        hardCap: plan.hardCap,
        maxF: plan.maxF,
        maxR: plan.maxR,
        recentSignatures: infinite.history.slice(-20).map((h) => h.signature),
        maxCandidates: 80,
      }) || openingLevel();
    infinite.sizeCounts[generated.size] = (infinite.sizeCounts[generated.size] ?? 0) + 1;
    play = createPlay(generated, settings);
    modal = null;
    toast = "";
    persist();
  }

  function onWin(): void {
    if (!play || play.recorded) return;
    play.recorded = true;
    const result = resultOf(play);
    if (mode === "infinite") {
      infinite.stats.completed += 1;
      if (result.independent) infinite.stats.independent += 1;
      if (result.flawless) infinite.stats.flawless += 1;
      const rec: PaceHistory = {
        score: play.level.rating?.score ?? 0,
        purpose: "normal",
        size: play.level.size,
        signature: play.level.signature ?? play.level.id,
      };
      infinite.history = [...infinite.history, rec].slice(-20);
    }
    modal = "result";
    persist();
  }

  function cellAt(x: number, y: number): number | null {
    if (!play) return null;
    const n = play.level.size;
    if (
      x < boardRect.x ||
      y < boardRect.y ||
      x >= boardRect.x + boardRect.w ||
      y >= boardRect.y + boardRect.h
    ) {
      return null;
    }
    const pitch = boardRect.w / n;
    const col = Math.floor((x - boardRect.x) / pitch);
    const row = Math.floor((y - boardRect.y) / pitch);
    if (col < 0 || row < 0 || col >= n || row >= n) return null;
    return row * n + col;
  }

  function addHit(id: string, rect: Rect): Rect {
    hits.push({ id, rect });
    return rect;
  }

  function frame(): Rect {
    const pad = 20;
    return {
      x: pad,
      y: env.insetTop + 8,
      w: env.width - pad * 2,
      h: env.height - env.insetTop - env.insetBottom - 16,
    };
  }

  function drawHome(ctx: CanvasRenderingContext2DLike): void {
    const box = frame();
    ctx.fillStyle = theme.ink;
    ctx.font = "700 14px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("各就喵位", box.x + 6, box.y + 10);
    ctx.fillStyle = theme.mute;
    ctx.font = "13px sans-serif";
    ctx.fillText("Purrdoku · 牛乳贴纸本", box.x + 6, box.y + 32);
    const gear = addHit("settings", {
      x: box.x + box.w - 48,
      y: box.y + 4,
      w: 44,
      h: 44,
    });
    fillRound(ctx, gear, theme.cream, 16);
    ctx.fillStyle = theme.ink;
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("设", gear.x + 22, gear.y + 13);

    drawCat(ctx, env.width / 2, box.y + 168, 2.15);
    ctx.fillStyle = theme.ink;
    ctx.font = "800 34px sans-serif";
    ctx.fillText("把猫请回颜色里", env.width / 2, box.y + 268);
    ctx.fillStyle = theme.mute;
    ctx.font = "14px sans-serif";
    ctx.fillText("每行每列每色一只，彼此还不能挨着", env.width / 2, box.y + 312);

    const start = addHit("start", { x: box.x + 18, y: box.y + 356, w: box.w - 36, h: 58 });
    fillRound(ctx, start, theme.seal, 29);
    ctx.fillStyle = theme.cream;
    ctx.font = "800 20px sans-serif";
    ctx.fillText(infinite.play ? "继续贴纸" : "开始游戏", start.x + start.w / 2, start.y + 18);

    const daily = addHit("daily", {
      x: box.x + 18,
      y: start.y + 74,
      w: (box.w - 44) / 2,
      h: 72,
    });
    const help = addHit("help", { x: daily.x + daily.w + 8, y: daily.y, w: daily.w, h: 72 });
    fillRound(ctx, daily, theme.cream, 18);
    fillRound(ctx, help, theme.cream, 18);
    ctx.fillStyle = theme.ink;
    ctx.font = "700 16px sans-serif";
    ctx.fillText("每日挑战", daily.x + daily.w / 2, daily.y + 18);
    ctx.fillText("怎么玩", help.x + help.w / 2, help.y + 18);
    ctx.fillStyle = theme.mute;
    ctx.font = "12px sans-serif";
    ctx.fillText(localDate(), daily.x + daily.w / 2, daily.y + 42);
    ctx.fillText("四条规则", help.x + help.w / 2, help.y + 42);

    ctx.fillStyle = theme.mute;
    ctx.fillText(
      `旅程 ${infinite.stats.completed}  ·  独立 ${infinite.stats.independent}  ·  无失误 ${infinite.stats.flawless}`,
      env.width / 2,
      box.y + box.h - 24,
    );
  }

  function drawPlay(ctx: CanvasRenderingContext2DLike): void {
    if (!play) return;
    const box = frame();
    const back = addHit("back", { x: box.x, y: box.y, w: 52, h: 40 });
    fillRound(ctx, back, theme.cream, 14);
    ctx.fillStyle = theme.ink;
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("回", back.x + 26, back.y + 21);

    ctx.textBaseline = "top";
    ctx.font = "800 18px sans-serif";
    ctx.fillStyle = theme.ink;
    ctx.fillText(mode === "daily" ? "每日挑战" : `第 ${infinite.ordinal} 关`, env.width / 2, box.y + 8);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = theme.mute;
    ctx.fillText(
      `${mode === "daily" ? "轻松" : difficultyName[play.level.difficulty]} · ${play.level.size}×${play.level.size}`,
      env.width / 2,
      box.y + 32,
    );

    const more = addHit("more", { x: box.x + box.w - 52, y: box.y, w: 52, h: 40 });
    fillRound(ctx, more, theme.cream, 14);
    ctx.fillStyle = theme.ink;
    ctx.font = "16px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("…", more.x + 26, more.y + 20);

    const cats = play.board.filter((c) => c === "cat").length;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.font = "13px sans-serif";
    ctx.fillStyle = theme.ink;
    ctx.fillText(`${cats} / ${play.level.size} 只猫`, box.x + 4, box.y + 56);
    const t = Math.floor(play.elapsed);
    ctx.textAlign = "right";
    ctx.fillText(
      `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}  ·  失误 ${play.mistakes}`,
      box.x + box.w - 4,
      box.y + 56,
    );
    for (let i = 0; i < 3; i++) {
      drawPaw(ctx, box.x + 92 + i * 22, box.y + 78, i < starsFor(play.mistakes));
    }

    const n = play.level.size;
    const board = Math.min(box.w, env.height - box.y - 220 - env.insetBottom);
    boardRect = {
      x: box.x + (box.w - board) / 2,
      y: box.y + 102,
      w: board,
      h: board,
    };
    const pitch = board / n;
    const gap = Math.max(2.2, pitch * 0.08);
    fillRound(
      ctx,
      { x: boardRect.x - 8, y: boardRect.y - 8, w: board + 16, h: board + 16 },
      theme.cream,
      22,
    );
    const shown = previewDrag
      ? markLine(play.board, previewDrag.from, previewDrag.to, n)
      : play.board;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const x = boardRect.x + c * pitch + gap / 2;
        const y = boardRect.y + r * pitch + gap / 2;
        const s = pitch - gap;
        fillRound(
          ctx,
          { x, y, w: s, h: s },
          theme.regions[play.level.regions[r][c] % theme.regions.length],
          Math.min(12, s * 0.28),
        );
        if (i === focus) {
          strokeRound(ctx, { x, y, w: s, h: s }, theme.ink, Math.min(12, s * 0.28), 2);
        }
        const cell = shown[i];
        if (cell === "cat") drawMiniCat(ctx, x + s / 2, y + s / 2, s);
        if (cell === "markedX") drawMark(ctx, x + s / 2, y + s / 2, s, false);
        if (cell === "wrongX") drawMark(ctx, x + s / 2, y + s / 2, s, true);
      }
    }

    ctx.fillStyle = theme.mute;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("轻点记 ×    再点放猫    滑动连记", env.width / 2, boardRect.y + board + 14);

    const names = ["撤销", "提示", "重来", "规则"];
    const ids = ["undo", "hint", "restart", "rules"];
    const bw = (box.w - 18) / 4;
    names.forEach((name, i) => {
      const rect = addHit(ids[i], {
        x: box.x + i * (bw + 6),
        y: env.height - env.insetBottom - 78,
        w: bw,
        h: 52,
      });
      fillRound(ctx, rect, theme.cream, 18);
      ctx.fillStyle = theme.ink;
      ctx.font = "700 15px sans-serif";
      ctx.fillText(name, rect.x + rect.w / 2, rect.y + 18);
    });
    if (toast) {
      ctx.fillStyle = theme.seal;
      ctx.fillText(toast, env.width / 2, boardRect.y + board + 32);
    }
  }

  function modalFrame(): Rect {
    const w = Math.min(340, env.width - 28);
    const h = Math.min(460, env.height - 120);
    return { x: (env.width - w) / 2, y: (env.height - h) / 2, w, h };
  }

  function drawModal(ctx: CanvasRenderingContext2DLike): void {
    if (!modal) return;
    ctx.fillStyle = "rgba(44,33,28,0.38)";
    ctx.fillRect(0, 0, env.width, env.height);
    const box = modalFrame();
    card(ctx, box, 26);
    ctx.fillStyle = theme.ink;
    ctx.font = "800 20px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const titles: Record<Exclude<Modal, null>, string> = {
      settings: "设置",
      help: "怎么玩",
      rules: "规则",
      hint: hint?.title ?? "提示",
      result: "贴纸贴好了",
      restart: "重来",
      clear: "清除进度",
    };
    ctx.fillText(titles[modal], box.x + 24, box.y + 22);
    const close = addHit("close", { x: box.x + box.w - 70, y: box.y + 14, w: 52, h: 40 });
    fillRound(ctx, close, theme.paperDeep, 14);
    ctx.textAlign = "center";
    ctx.font = "14px sans-serif";
    ctx.fillText("关闭", close.x + 26, close.y + 12);

    if (modal === "help" || modal === "rules") {
      const lines = [
        "1. 每行、每列、每个颜色区域恰好一只猫。",
        "2. 任意两只猫不能上下、左右或斜对角相邻。远处对角可以。",
        "3. 轻点空白格做 × 笔记；短时间内再点同一格放猫。",
        "4. 按住滑动可连续标记。找齐所有猫即可通关，不必填满 ×。",
        "5. 放错会记一次失误，但不会立刻结束。",
      ];
      let y = box.y + 78;
      ctx.textAlign = "left";
      ctx.font = "14px sans-serif";
      ctx.fillStyle = theme.ink;
      for (const line of lines) {
        const wrapped = wrapText(ctx, line, box.w - 48, "14px sans-serif");
        for (const row of wrapped) {
          ctx.fillText(row, box.x + 24, y);
          y += 22;
        }
        y += 8;
      }
    }

    if (modal === "settings") {
      const rows: { key: keyof Settings; label: string }[] = [
        { key: "autoMarkEnabled", label: "自动标记" },
        { key: "soundEnabled", label: "游戏音效" },
        { key: "musicEnabled", label: "背景音乐" },
        { key: "hapticEnabled", label: "触觉反馈" },
        { key: "animationsEnabled", label: "动态效果" },
      ];
      rows.forEach((row, i) => {
        const y = box.y + 84 + i * 52;
        ctx.textAlign = "left";
        ctx.fillStyle = theme.ink;
        ctx.font = "16px sans-serif";
        ctx.fillText(row.label, box.x + 24, y);
        const sw = addHit(`set:${row.key}`, { x: box.x + box.w - 78, y: y - 6, w: 50, h: 30 });
        fillRound(ctx, sw, settings[row.key] ? theme.seal : theme.line, 15);
        ctx.fillStyle = theme.cream;
        ctx.beginPath();
        ctx.arc(settings[row.key] ? sw.x + 34 : sw.x + 16, sw.y + 15, 10, 0, Math.PI * 2);
        ctx.fill();
      });
      const wipe = addHit("wipe", { x: box.x + 24, y: box.y + box.h - 70, w: box.w - 48, h: 44 });
      fillRound(ctx, wipe, theme.paperDeep, 16);
      ctx.textAlign = "center";
      ctx.fillStyle = theme.seal;
      ctx.font = "16px sans-serif";
      ctx.fillText("清除全部进度", wipe.x + wipe.w / 2, wipe.y + 13);
    }

    if (modal === "hint" && hint) {
      ctx.textAlign = "left";
      ctx.font = "14px sans-serif";
      ctx.fillStyle = theme.ink;
      let y = box.y + 78;
      for (const line of wrapText(ctx, hint.reason, box.w - 48, "14px sans-serif")) {
        ctx.fillText(line, box.x + 24, y);
        y += 22;
      }
      const apply = addHit("applyHint", { x: box.x + 24, y: box.y + box.h - 70, w: box.w - 48, h: 46 });
      fillRound(ctx, apply, theme.seal, 18);
      ctx.textAlign = "center";
      ctx.fillStyle = theme.cream;
      ctx.font = "800 16px sans-serif";
      ctx.fillText("应用到棋盘", apply.x + apply.w / 2, apply.y + 14);
    }

    if (modal === "result" && play) {
      const result = resultOf(play);
      ctx.textAlign = "center";
      ctx.fillStyle = theme.ink;
      ctx.font = "16px sans-serif";
      ctx.fillText(`${play.level.size} 只猫都就位了`, env.width / 2, box.y + 84);
      for (let i = 0; i < 3; i++) drawPaw(ctx, env.width / 2 - 28 + i * 28, box.y + 130, i < result.stars);
      ctx.fillStyle = theme.mute;
      ctx.font = "14px sans-serif";
      ctx.fillText(
        `用时 ${Math.floor(play.elapsed)} 秒 · 失误 ${play.mistakes} · 提示 ${play.hintsUsed}`,
        env.width / 2,
        box.y + 168,
      );
      if (mode === "infinite") {
        const go = addHit("next", { x: box.x + 24, y: box.y + box.h - 70, w: box.w - 48, h: 46 });
        fillRound(ctx, go, theme.seal, 18);
        ctx.fillStyle = theme.cream;
        ctx.font = "800 16px sans-serif";
        ctx.fillText("下一关", go.x + go.w / 2, go.y + 14);
      }
    }

    if (modal === "restart") {
      ctx.textAlign = "left";
      ctx.font = "15px sans-serif";
      ctx.fillStyle = theme.ink;
      ctx.fillText("同一题从头再贴，当前失误会清零。", box.x + 24, box.y + 90);
      const ok = addHit("doRestart", { x: box.x + 24, y: box.y + box.h - 70, w: box.w - 48, h: 46 });
      fillRound(ctx, ok, theme.seal, 18);
      ctx.textAlign = "center";
      ctx.fillStyle = theme.cream;
      ctx.font = "800 16px sans-serif";
      ctx.fillText("确定重来", ok.x + ok.w / 2, ok.y + 14);
    }

    if (modal === "clear") {
      ctx.textAlign = "left";
      ctx.font = "15px sans-serif";
      ctx.fillStyle = theme.ink;
      ctx.fillText("会清掉闯关、每日和统计，不能恢复。", box.x + 24, box.y + 90);
      const ok = addHit("doClear", { x: box.x + 24, y: box.y + box.h - 70, w: box.w - 48, h: 46 });
      fillRound(ctx, ok, theme.seal, 18);
      ctx.textAlign = "center";
      ctx.fillStyle = theme.cream;
      ctx.font = "800 16px sans-serif";
      ctx.fillText("确定清除", ok.x + ok.w / 2, ok.y + 14);
    }
  }

  function tap(id: string): void {
    if (id === "close") {
      modal = null;
      hint = null;
      return;
    }
    if (id === "settings") modal = "settings";
    if (id === "help") modal = "help";
    if (id === "start") startInfinite();
    if (id === "daily") startDaily();
    if (id === "back") {
      scene = "home";
      modal = null;
      persist();
    }
    if (id === "more") modal = "settings";
    if (id === "undo" && play) undo(play);
    if (id === "hint" && play && !play.completed) {
      hint = peekHint(play);
      if (hint) {
        noteHintShown(play);
        modal = "hint";
      }
    }
    if (id === "restart") modal = "restart";
    if (id === "rules") modal = "rules";
    if (id === "applyHint" && play && hint) {
      applyHint(play, hint);
      if (play.completed) onWin();
      else modal = null;
      hint = null;
    }
    if (id === "next") nextInfinite();
    if (id === "doRestart" && play) {
      restart(play, mode);
      modal = null;
    }
    if (id === "wipe") modal = "clear";
    if (id === "doClear") {
      settings = defaultSettings();
      shell = { settings, daily: {} };
      infinite = {
        playerSeed: newSeed(),
        ordinal: 0,
        play: null,
        stats: { completed: 0, independent: 0, flawless: 0 },
        history: [],
        sizeCounts: { 6: 0, 7: 0, 8: 0, 9: 0 },
      };
      play = null;
      scene = "home";
      modal = null;
    }
    if (id.startsWith("set:")) {
      const key = id.slice(4) as keyof Settings;
      settings[key] = !settings[key];
      if (play) play.settings = settings;
    }
    persist();
  }

  function pointer(kind: "start" | "move" | "end" | "cancel", x: number, y: number, id: number): void {
    if (kind === "cancel") {
      gestures.cancel();
      previewDrag = null;
      return;
    }
    if (modal) {
      if (kind === "end") {
        const target = [...hits].reverse().find((h) => hit(h.rect, x, y));
        if (target) tap(target.id);
      }
      return;
    }
    if (scene === "home") {
      if (kind === "end") {
        const target = [...hits].reverse().find((h) => hit(h.rect, x, y));
        if (target) tap(target.id);
      }
      return;
    }
    const cell = cellAt(x, y);
    if (cell !== null && play && !play.completed) {
      if (kind === "start") gestures.start(cell, id);
      if (kind === "move") gestures.move(cell);
      if (kind === "end") gestures.end();
      focus = cell;
      return;
    }
    if (kind === "start") gestures.cancel();
    if (kind === "end") {
      previewDrag = null;
      const target = [...hits].reverse().find((h) => hit(h.rect, x, y));
      if (target) tap(target.id);
    }
  }

  function key(code: string): void {
    if (modal || scene !== "play" || !play || play.completed) return;
    const n = play.level.size;
    if (code === "ArrowLeft") focus = Math.max(0, focus - 1);
    if (code === "ArrowRight") focus = Math.min(n * n - 1, focus + 1);
    if (code === "ArrowUp") focus = Math.max(0, focus - n);
    if (code === "ArrowDown") focus = Math.min(n * n - 1, focus + n);
    if (code === "Space") toggleCell(play, focus);
    if (code === "Enter") {
      placeOn(play, focus);
      if (play.completed) onWin();
    }
    persist();
  }

  function draw(): void {
    const ctx = env.ctx;
    hits = [];
    try {
      paintPaper(ctx, env.width, env.height);
      if (scene === "home") drawHome(ctx);
      else drawPlay(ctx);
      drawModal(ctx);
    } catch (err) {
      ctx.fillStyle = theme.seal;
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(err), env.width / 2, 40);
    }
  }

  function loop(ts: number): void {
    const dt = lastTs ? Math.min(0.2, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    const counting = visible && scene === "play" && !!play && !play.completed && !modal;
    if (play) tickPlay(play, dt, counting);
    draw();
    requestAnimationFrame(loop);
  }

  wx.onTouchStart((e) => {
    const t = e.changedTouches[0];
    if (t) pointer("start", t.clientX, t.clientY, t.identifier);
  });
  wx.onTouchMove((e) => {
    const t = e.changedTouches[0];
    if (t) pointer("move", t.clientX, t.clientY, t.identifier);
  });
  wx.onTouchEnd((e) => {
    const t = e.changedTouches[0];
    if (t) pointer("end", t.clientX, t.clientY, t.identifier);
  });
  wx.onTouchCancel((e) => {
    const t = e.changedTouches[0];
    if (t) pointer("cancel", t.clientX, t.clientY, t.identifier);
  });
  wx.onKeyDown?.((e) => key(e.code || e.key || ""));
  wx.onHide(() => {
    visible = false;
    gestures.cancel();
    previewDrag = null;
    persist();
  });
  wx.onShow(() => {
    visible = true;
    lastTs = 0;
    fit(env);
  });
  wx.onWindowResize?.(() => fit(env));

  requestAnimationFrame(loop);

  return { draw, persist };
}
