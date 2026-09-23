import { generatePuzzle, type GenerateRequest } from "../engine/generate";
import { planLevel, type LevelPlan, type PaceHistory } from "../engine/pacer";
import { hashSeed, rngFrom } from "../engine/rng";
import { markPath, starsFor } from "../engine/board";
import { CURRENT_VERSIONS, tagGeneratedLevel } from "../engine/versions";
import { staticLevels } from "../data/static";
import {
  applyHint,
  createPlay,
  dragMarkPath,
  ensureCatFaces,
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
import { PuzzleQueue } from "../game/puzzle-queue";
import {
  INFINITE_KEY,
  SAVE_KEY,
  dailyRecordKey,
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
  drawHeroPortrait,
  loadCatBlink,
  loadHeroCat,
  drawMark,
  drawMiniCat,
  drawPaw,
  paintPaper,
  wrapText,
} from "./paint";
import {
  difficultyName,
  fillPrimary,
  fillRound,
  strokeRound,
  theme,
  type Rect,
} from "./theme";
import { defaultSettings, type HintPlan, type Settings } from "../types";
import {
  beginPress,
  keepPress,
  releasePress,
  type PressState,
  type PressTarget,
} from "./input";
import {
  catIdleFrame,
  regionFlashAmount,
  sampleBoardMotion,
  type BoardMotionKind,
} from "./board-motion";
import type { CellState } from "../types";

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

interface PreparedPuzzle {
  ordinal: number;
  plan: LevelPlan;
  level: ReturnType<typeof tagGeneratedLevel>;
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
    versions: CURRENT_VERSIONS,
    playerSeed: newSeed(),
    ordinal: 0,
    play: null,
    stats: { completed: 0, independent: 0, flawless: 0 },
    history: [],
    sizeCounts: { 6: 0, 7: 0, 8: 0, 9: 0 },
  });
  return {
    versions: {
      generator: raw.versions?.generator ?? CURRENT_VERSIONS.generator,
      pacer: raw.versions?.pacer ?? CURRENT_VERSIONS.pacer,
    },
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
  loadHeroCat(env.canvas);
  loadCatBlink(env.canvas);

  let shell = loadShell();
  let settings: Settings = shell.settings;
  let infinite = loadInfinite();

  let scene: Scene = "home";
  let modal: Modal = null;
  let mode: Mode = "infinite";
  let play: PlayState | null = infinite.play;
  if (play) ensureCatFaces(play);
  let hint: HintPlan | null = null;
  let lastTs = 0;
  let visible = true;
  let focus = 0;
  let hits: PressTarget[] = [];
  let uiPress: PressState | null = null;
  let activeTouchId: number | null = null;
  let boardRect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  let previewPath: number[] | null = null;
  let pressedCell: number | null = null;
  let toast = "";
  let preparedPuzzle: PreparedPuzzle | null = null;
  let preparingPuzzle = false;
  let generationError = "";
  let visualTime = 0;
  let motionTime = 0;
  const boardMotions = new Map<number, { kind: BoardMotionKind; startedAt: number }>();
  const regionFlashes = new Map<number, number>();

  const puzzleQueue = new PuzzleQueue<PreparedPuzzle>();

  function clearBoardMotion(): void {
    boardMotions.clear();
    regionFlashes.clear();
  }

  function recordBoardMotion(
    before: CellState[],
    attemptedIndex: number | null = null,
    mistakesBefore = play?.mistakes ?? 0,
  ): void {
    if (!play || !settings.animationsEnabled) return;
    for (let index = 0; index < play.board.length; index++) {
      const previous = before[index];
      const next = play.board[index];
      let kind: BoardMotionKind | null = null;
      if (previous === "markedX" && next === "empty") kind = "mark-out";
      else if (previous !== "markedX" && next === "markedX") kind = "mark-in";
      else if (previous !== "cat" && next === "cat") {
        kind = "cat-in";
        const row = Math.floor(index / play.level.size);
        const col = index % play.level.size;
        regionFlashes.set(play.level.regions[row]![col]!, motionTime);
      } else if (previous !== "wrongX" && next === "wrongX") kind = "wrong";
      if (kind) boardMotions.set(index, { kind, startedAt: motionTime });
    }
    if (attemptedIndex !== null && play.mistakes > mistakesBefore) {
      boardMotions.set(attemptedIndex, { kind: "wrong", startedAt: motionTime });
    }
  }

  const gestures = new GestureMachine(
    {
      later(ms, fn) {
        const id = setTimeout(fn, ms);
        return () => clearTimeout(id);
      },
    },
    (action) => {
      if (!play || modal) return;
      const before = play.board.slice();
      const mistakesBefore = play.mistakes;
      let changed = false;
      if (action.type === "toggle") changed = toggleCell(play, action.index);
      if (action.type === "place") {
        changed = placeOn(play, action.index);
        if (changed) {
          if (play.completed) onWin();
          buzz();
        }
      }
      if (action.type === "drag") {
        changed = dragMarkPath(play, action.path);
        previewPath = null;
      }
      if (action.type === "preview") {
        previewPath = action.path;
        pressedCell = null;
      }
      if (changed) {
        recordBoardMotion(before, action.type === "place" ? action.index : null, mistakesBefore);
      }
      if (changed) persist();
    },
  );

  function persist(): void {
    shell.settings = settings;
    if (mode === "daily" && play) {
      const key = dailyRecordKey(play);
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

  function planFor(ordinal: number): LevelPlan {
    return planLevel(
      ordinal,
      infinite.history,
      infinite.sizeCounts,
      rngFrom(`${infinite.playerSeed}|${ordinal}`),
    );
  }

  function generationKey(ordinal: number, plan: LevelPlan, maxCandidates: number): string {
    return JSON.stringify([
      infinite.playerSeed,
      ordinal,
      plan,
      infinite.history.map((entry) => entry.signature),
      CURRENT_VERSIONS,
      maxCandidates,
    ]);
  }

  async function prepareNextPuzzle(maxCandidates = 80): Promise<PreparedPuzzle | null> {
    const ordinal = infinite.ordinal + 1;
    if (preparedPuzzle?.ordinal === ordinal) return preparedPuzzle;
    const plan = planFor(ordinal);
    const key = generationKey(ordinal, plan, maxCandidates);
    preparingPuzzle = true;
    generationError = "";
    toast = "正在准备下一关…";
    try {
      const prepared = await puzzleQueue.prepare(key, () => {
        const generated = makePuzzle({
          seed: `${infinite.playerSeed}|${ordinal}|v${CURRENT_VERSIONS.generator}`,
          size: plan.size,
          scoreMin: plan.scoreMin,
          scoreMax: plan.scoreMax,
          combinations: plan.combinations,
          easyGeometry: plan.easyGeometry,
          hardCap: plan.hardCap,
          maxF: plan.maxF,
          maxR: plan.maxR,
          recentSignatures: infinite.history.slice(-20).map((entry) => entry.signature),
          maxCandidates,
        });
        return generated
          ? { ordinal, plan, level: tagGeneratedLevel(generated, plan.purpose) }
          : null;
      });
      if (ordinal !== infinite.ordinal + 1) return null;
      preparedPuzzle = prepared;
      toast = "下一关准备好啦";
      return prepared;
    } catch {
      if (ordinal !== infinite.ordinal + 1) return null;
      generationError = "这次没准备好，当前进度已保留。";
      toast = generationError;
      return null;
    } finally {
      preparingPuzzle = false;
    }
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
      ensureCatFaces(play);
      if (play.completed) {
        modal = "result";
        void prepareNextPuzzle();
      }
      persist();
      return;
    }
    const ordinal = infinite.ordinal > 0 ? infinite.ordinal : 1;
    const plan = planFor(ordinal);
    const generated =
      ordinal <= 5
        ? openingLevel()
        : makePuzzle({
            seed: `${infinite.playerSeed}|${ordinal}|v${CURRENT_VERSIONS.generator}`,
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
          });
    if (!generated) {
      generationError = "这次没准备好，请重试。";
      scene = "home";
      return;
    }
    infinite.ordinal = ordinal;
    infinite.versions = { ...CURRENT_VERSIONS };
    infinite.sizeCounts[generated.size] = (infinite.sizeCounts[generated.size] ?? 0) + 1;
    play = createPlay(
      tagGeneratedLevel(
        { ...generated, source: ordinal <= 5 ? "opening" : generated.source },
        plan.purpose,
      ),
      settings,
    );
    clearBoardMotion();
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
      ensureCatFaces(play);
      modal = play.completed ? "result" : null;
      persist();
      return;
    }
    const level = staticLevels[dailyIndex(localDate(), staticLevels.length)];
    play = createPlay({ ...level, id: key, difficulty: "easy" }, settings);
    clearBoardMotion();
    modal = null;
    persist();
  }

  async function nextInfinite(): Promise<void> {
    if (!play || !play.completed || preparingPuzzle) return;
    if (!preparedPuzzle) {
      puzzleQueue.clear();
      await prepareNextPuzzle(800);
    }
    const prepared = preparedPuzzle;
    if (!prepared || prepared.ordinal !== infinite.ordinal + 1) return;
    infinite.ordinal = prepared.ordinal;
    infinite.versions = { ...CURRENT_VERSIONS };
    infinite.sizeCounts[prepared.level.size] =
      (infinite.sizeCounts[prepared.level.size] ?? 0) + 1;
    play = createPlay(prepared.level, settings);
    clearBoardMotion();
    preparedPuzzle = null;
    puzzleQueue.clear();
    modal = null;
    toast = "";
    generationError = "";
    persist();
  }

  function onWin(): void {
    if (!play) return;
    if (play.recorded) {
      modal = "result";
      persist();
      return;
    }
    play.recorded = true;
    const result = resultOf(play);
    if (mode === "infinite") {
      infinite.stats.completed += 1;
      if (result.independent) infinite.stats.independent += 1;
      if (result.flawless) infinite.stats.flawless += 1;
      const rec: PaceHistory = {
        score: play.level.rating?.score ?? 0,
        purpose: play.level.generation?.purpose ?? "normal",
        size: play.level.size,
        signature: play.level.signature ?? play.level.id,
      };
      infinite.history = [...infinite.history, rec].slice(-20);
    }
    modal = "result";
    persist();
    if (mode === "infinite") void prepareNextPuzzle();
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
    const cx = env.width / 2;
    const h = box.h;

    // 1. Left brand chip
    ctx.fillStyle = theme.muted;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("● 各就喵位 · 猫咪逻辑游戏", box.x + 4, box.y + 22);

    // 2. Circular settings gear
    const gear = addHit("settings", {
      x: box.x + box.w - 42,
      y: box.y + 4,
      w: 40,
      h: 40,
    });
    const gx = gear.x + gear.w / 2;
    const gy = gear.y + gear.h / 2;
    ctx.fillStyle = theme.surface;
    ctx.beginPath();
    ctx.arc(gx, gy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.muted;
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚙", gx, gy + 1);

    // 3. Eyebrow with letter spacing
    const eyebrowY = box.y + h * 0.085;
    const eyebrow = "YOUR COZY PUZZLE CORNER";
    ctx.fillStyle = theme.eyebrow;
    ctx.font = "600 11px sans-serif";
    ctx.textAlign = "left";
    const gap = 3.2;
    let eyebrowW = 0;
    for (const ch of eyebrow) eyebrowW += ctx.measureText(ch).width + gap;
    eyebrowW -= gap;
    let ex = cx - eyebrowW / 2;
    for (const ch of eyebrow) {
      ctx.fillText(ch, ex, eyebrowY);
      ex += ctx.measureText(ch).width + gap;
    }

    // 4. Title + star + subtitle
    const titleY = box.y + h * 0.135;
    ctx.font = "800 36px sans-serif";
    const purr = "Purr";
    const doku = "doku";
    const purrW = ctx.measureText(purr).width;
    const dokuW = ctx.measureText(doku).width;
    const titleX = cx - (purrW + dokuW) / 2;
    ctx.fillStyle = theme.ink;
    ctx.fillText(purr, titleX, titleY);
    ctx.fillStyle = theme.accent;
    ctx.fillText(doku, titleX + purrW, titleY);
    // small four-point star by the final u
    const starX = titleX + purrW + dokuW + 6;
    const starY = titleY - 12;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 - Math.PI / 2;
      const ox = Math.cos(a) * 5;
      const oy = Math.sin(a) * 5;
      const ix = Math.cos(a + Math.PI / 4) * 1.8;
      const iy = Math.sin(a + Math.PI / 4) * 1.8;
      if (i === 0) ctx.moveTo(starX + ox, starY + oy);
      else ctx.lineTo(starX + ox, starY + oy);
      ctx.lineTo(starX + ix, starY + iy);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = theme.muted;
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("不慌不忙，", cx, box.y + h * 0.195);
    ctx.fillText("在色彩里让小猫各就各位", cx, box.y + h * 0.225);

    // 5. Hero portrait (scale down on short screens)
    const heroR = Math.min(box.w * 0.28, h * 0.155, 98);
    const heroCy = box.y + h * 0.39;
    drawHeroPortrait(ctx, cx, heroCy, heroR);

    // 6. Primary CTA（气泡在光圈下方，留出空隙）
    const startH = Math.max(52, Math.min(58, h * 0.095));
    const startY = Math.min(
      heroCy + heroR * 1.28 + h * 0.02,
      box.y + h - startH - 120,
    );
    const start = addHit("start", {
      x: box.x + 16,
      y: startY,
      w: box.w - 32,
      h: startH,
    });
    fillPrimary(ctx, start, startH * 0.48);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const playLabel = infinite.play ? "继续游戏 · PLAY" : "开始游戏 · PLAY";
    ctx.fillText(playLabel, start.x + start.w / 2, start.y + start.h / 2);
    // play triangle
    ctx.beginPath();
    ctx.moveTo(start.x + 28, start.y + start.h / 2 - 7);
    ctx.lineTo(start.x + 28, start.y + start.h / 2 + 7);
    ctx.lineTo(start.x + 40, start.y + start.h / 2);
    ctx.closePath();
    ctx.fill();
    // chevron
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const ax = start.x + start.w - 30;
    const ay = start.y + start.h / 2;
    ctx.beginPath();
    ctx.moveTo(ax - 4, ay - 6);
    ctx.lineTo(ax + 2, ay);
    ctx.lineTo(ax - 4, ay + 6);
    ctx.stroke();

    ctx.fillStyle = theme.muted;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("自动保存进度，随时接着玩。", cx, start.y + start.h + 10);

    // 7. Dual cards
    const cardH = Math.max(68, Math.min(78, h * 0.12));
    const cardY = Math.min(start.y + start.h + 36, box.y + h - cardH - 34);
    const gapCards = 10;
    const cardW = (box.w - 32 - gapCards) / 2;
    const daily = addHit("daily", {
      x: box.x + 16,
      y: cardY,
      w: cardW,
      h: cardH,
    });
    const help = addHit("help", {
      x: daily.x + daily.w + gapCards,
      y: cardY,
      w: cardW,
      h: cardH,
    });
    card(ctx, daily, 18);
    card(ctx, help, 18);

    const iconPad = (rect: Rect): Rect => ({
      x: rect.x + 14,
      y: rect.y + (rect.h - 28) / 2,
      w: 28,
      h: 28,
    });
    const dailyIcon = iconPad(daily);
    const helpIcon = iconPad(help);
    ctx.globalAlpha = 0.2;
    fillRound(ctx, dailyIcon, theme.accentSoft, 10);
    fillRound(ctx, helpIcon, theme.accentSoft, 10);
    ctx.globalAlpha = 1;
    // calendar glyph
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.6;
    const cal = {
      x: dailyIcon.x + 7,
      y: dailyIcon.y + 8,
      w: 14,
      h: 12,
    };
    strokeRound(ctx, cal, theme.accent, 2.5, 1.6);
    ctx.beginPath();
    ctx.moveTo(cal.x, cal.y + 4);
    ctx.lineTo(cal.x + cal.w, cal.y + 4);
    ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.fillRect(cal.x + 3, cal.y + 6, 3, 3);
    ctx.fillRect(cal.x + 8, cal.y + 6, 3, 3);
    // bulb glyph
    const bx = helpIcon.x + 14;
    const by = helpIcon.y + 12;
    ctx.beginPath();
    ctx.arc(bx, by, 5.5, Math.PI * 0.15, Math.PI * 0.85, true);
    ctx.lineTo(bx + 3.2, by + 7);
    ctx.lineTo(bx - 3.2, by + 7);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - 2.5, by + 9);
    ctx.lineTo(bx + 2.5, by + 9);
    ctx.stroke();

    ctx.fillStyle = theme.ink;
    ctx.font = "700 15px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("每日挑战", daily.x + 50, daily.y + cardH * 0.38);
    ctx.fillText("怎么玩", help.x + 50, help.y + cardH * 0.38);
    ctx.fillStyle = theme.muted;
    ctx.font = "12px sans-serif";
    ctx.fillText("今天也来一局", daily.x + 50, daily.y + cardH * 0.66);
    ctx.fillText("认识小猫的规则", help.x + 50, help.y + cardH * 0.66);

    // 8. Footer
    ctx.fillStyle = theme.muted;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♡  一点逻辑，一点治愈。", cx, box.y + h - 18);
  }

  function drawPlay(ctx: CanvasRenderingContext2DLike): void {
    if (!play) return;
    const box = frame();
    const cx = env.width / 2;
    const n = play.level.size;
    const narrow = box.w < 340;

    // —— 顶栏圆钮 ——
    const topBtn = addHit("back", { x: box.x, y: box.y + 2, w: 40, h: 40 });
    const bx = topBtn.x + topBtn.w / 2;
    const by = topBtn.y + topBtn.h / 2;
    ctx.fillStyle = theme.surface;
    ctx.beginPath();
    ctx.arc(bx, by, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(bx + 3, by - 7);
    ctx.lineTo(bx - 5, by);
    ctx.lineTo(bx + 3, by + 7);
    ctx.stroke();

    const more = addHit("more", { x: box.x + box.w - 40, y: box.y + 2, w: 40, h: 40 });
    const mx = more.x + more.w / 2;
    const my = more.y + more.h / 2;
    ctx.fillStyle = theme.surface;
    ctx.beginPath();
    ctx.arc(mx, my, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.muted;
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚙", mx, my + 1);

    // 中：英文字眉 + 中文标题
    const eyebrow = mode === "daily" ? "DAILY CHALLENGE" : "LEVEL";
    const title = mode === "daily" ? "每日挑战" : `第 ${infinite.ordinal} 关`;
    ctx.fillStyle = theme.eyebrow;
    ctx.font = "600 10px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const gapCh = 2.4;
    let eyebrowW = 0;
    for (const ch of eyebrow) eyebrowW += ctx.measureText(ch).width + gapCh;
    eyebrowW -= gapCh;
    let ex = cx - eyebrowW / 2;
    for (const ch of eyebrow) {
      ctx.fillText(ch, ex, box.y + 12);
      ex += ctx.measureText(ch).width + gapCh;
    }
    ctx.fillStyle = theme.ink;
    ctx.font = "800 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, cx, box.y + 32);

    // 下行：绿点 + 难度 · N×N 与计时
    const statusY = box.y + 54;
    const diffLabel = `${difficultyName[play.level.difficulty]} · ${n}×${n}`;
    ctx.fillStyle = theme.success;
    ctx.beginPath();
    ctx.arc(box.x + 8, statusY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.muted;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(diffLabel, box.x + 18, statusY);
    const t = Math.floor(play.elapsed);
    const clock = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    ctx.textAlign = "right";
    ctx.fillText(clock, box.x + box.w - 4, statusY);

    // 白进度卡
    const cats = play.board.filter((c) => c === "cat").length;
    const progress: Rect = { x: box.x, y: statusY + 16, w: box.w, h: 52 };
    card(ctx, progress, 16);
    drawMiniCat(ctx, progress.x + 22, progress.y + progress.h / 2, 28);
    ctx.fillStyle = theme.ink;
    ctx.font = "700 14px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${cats} / ${n} 只猫已找到`, progress.x + 42, progress.y + progress.h / 2);
    const starBaseX = progress.x + progress.w - 78;
    for (let i = 0; i < 3; i++) {
      drawPaw(ctx, starBaseX + i * 22, progress.y + 16, i < starsFor(play.mistakes));
    }
    ctx.fillStyle = theme.muted;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`失误 ${play.mistakes} 次`, starBaseX + 22, progress.y + 38);

    // —— 底部预留：底栏 + 手势 + 可选页脚；优先保证棋盘 ——
    const btnD = 48;
    const btnLabelGap = 16;
    const bottomBarH = btnD + btnLabelGap + 6;
    const gestureH = 20;
    let rulesH = narrow ? 30 : 34;
    let footerH = 18;
    const boardPad = 6;
    const frameExtra = boardPad * 2;
    const afterProgress = progress.y + progress.h + 10;

    const fitBoard = (rh: number, fh: number): number => {
      const bottom = env.insetBottom + fh + bottomBarH + gestureH + 10;
      const avail = env.height - afterProgress - bottom - rh - 8 - frameExtra;
      return Math.min(box.w - 4, Math.max(120, avail));
    };

    let board = fitBoard(rulesH, footerH);
    if (board < box.w * 0.72) {
      rulesH = Math.max(0, rulesH - 14);
      board = fitBoard(rulesH, footerH);
    }
    if (board < box.w * 0.72) {
      footerH = 0;
      board = fitBoard(rulesH, footerH);
    }

    // 三规则短条
    let cursorY = afterProgress;
    if (rulesH > 0) {
      const labels = ["一色一猫", "行列各一", "互不相邻"];
      const gapR = 6;
      const rw = (box.w - gapR * 2) / 3;
      const ruleFont = narrow ? "9px sans-serif" : "10px sans-serif";
      for (let i = 0; i < 3; i++) {
        const rect: Rect = {
          x: box.x + i * (rw + gapR),
          y: cursorY,
          w: rw,
          h: rulesH,
        };
        fillRound(ctx, rect, theme.surface, 12);
        ctx.fillStyle = theme.ink;
        ctx.font = `600 ${ruleFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labels[i]!, rect.x + rect.w / 2, rect.y + rect.h / 2);
      }
      cursorY += rulesH + 8;
    }

    // 棋盘白底外框
    boardRect = {
      x: box.x + (box.w - board) / 2,
      y: cursorY + boardPad,
      w: board,
      h: board,
    };
    fillRound(
      ctx,
      {
        x: boardRect.x - boardPad,
        y: boardRect.y - boardPad,
        w: board + frameExtra,
        h: board + frameExtra,
      },
      theme.surface,
      18,
    );

    const pitch = board / n;
    const gap = Math.min(3, Math.max(2, pitch * 0.055));
    const shown = previewPath
      ? markPath(play.board, previewPath, n)
      : play.board;
    const showHint = Boolean(hint);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const x = boardRect.x + c * pitch + gap / 2;
        const y = boardRect.y + r * pitch + gap / 2;
        const s = pitch - gap;
        const rr = Math.min(5, Math.max(3, s * 0.09));
        const region = play.level.regions[r]![c]!;
        fillRound(
          ctx,
          { x, y, w: s, h: s },
          theme.regions[region % theme.regions.length]!,
          rr,
        );
        const flashStartedAt = regionFlashes.get(region);
        if (flashStartedAt !== undefined && settings.animationsEnabled) {
          const flash = regionFlashAmount(motionTime - flashStartedAt);
          if (flash > 0) {
            fillRound(ctx, { x, y, w: s, h: s }, `rgba(255,255,255,${flash})`, rr);
          } else regionFlashes.delete(region);
        }
        if (pressedCell === i) {
          fillRound(ctx, { x, y, w: s, h: s }, "rgba(255,255,255,0.12)", rr);
        }
        if (showHint && hint!.targets.includes(i)) {
          strokeRound(ctx, { x, y, w: s, h: s }, "#ffffff", rr, 3.2);
        }
        const cell = shown[i];
        if (cell === "cat") {
          ensureCatFaces(play);
          const motion = boardMotions.get(i);
          const sample = motion?.kind === "cat-in" && settings.animationsEnabled
            ? sampleBoardMotion(motion.kind, motionTime - motion.startedAt)
            : null;
          if (sample && !sample.alive) boardMotions.delete(i);
          drawMiniCat(
            ctx,
            x + s / 2,
            y + s / 2,
            s,
            catIdleFrame(visualTime, i, settings.animationsEnabled),
            sample?.scale ?? 1,
          );
        }
        const motion = boardMotions.get(i);
        const sample = motion && settings.animationsEnabled
          ? sampleBoardMotion(motion.kind, motionTime - motion.startedAt)
          : null;
        if (sample && !sample.alive) boardMotions.delete(i);
        if (cell === "markedX") {
          drawMark(ctx, x + s / 2, y + s / 2, s, false, sample?.opacity, sample?.scale);
        } else if (cell === "empty" && motion?.kind === "mark-out" && sample?.alive) {
          drawMark(ctx, x + s / 2, y + s / 2, s, false, sample.opacity, sample.scale);
        }
        if (cell === "wrongX") {
          drawMark(ctx, x + s / 2, y + s / 2, s, true, 1, 1, sample?.shakeX ?? 0);
        }
        if (showHint && hint!.sources.includes(i)) {
          const dx = x + s / 2;
          const dy = y + s * 0.22;
          const dr = Math.max(3, s * 0.08);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(dx, dy - dr);
          ctx.lineTo(dx + dr, dy);
          ctx.lineTo(dx, dy + dr);
          ctx.lineTo(dx - dr, dy);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // 手势行
    const gestureY = boardRect.y + board + boardPad + 12;
    ctx.fillStyle = theme.muted;
    ctx.font = narrow ? "10px sans-serif" : "11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("● 轻点标记 × · 双击放猫 · 滑动连续标记", cx, gestureY);
    if (toast) {
      ctx.fillStyle = theme.accent;
      ctx.font = "12px sans-serif";
      ctx.fillText(toast, cx, gestureY + 16);
    }

    // 底栏四圆钮
    const names = ["撤销", "提示", "重来", "规则"];
    const ids = ["undo", "hint", "restart", "rules"];
    const icons = ["↶", "💡", "↻", "▦"];
    const barY = env.height - env.insetBottom - footerH - bottomBarH;
    const span = box.w - 8;
    const step = span / 4;
    names.forEach((name, i) => {
      const cxBtn = box.x + 4 + step * i + step / 2;
      const rect = addHit(ids[i]!, {
        x: cxBtn - btnD / 2,
        y: barY,
        w: btnD,
        h: btnD + btnLabelGap,
      });
      ctx.fillStyle = ids[i] === "hint" ? theme.hintTint : theme.surface;
      ctx.beginPath();
      ctx.arc(cxBtn, barY + btnD / 2, btnD / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = theme.ink;
      ctx.font = "18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icons[i]!, cxBtn, barY + btnD / 2 + 1);
      ctx.fillStyle = theme.muted;
      ctx.font = "11px sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText(name, cxBtn, barY + btnD + 4);
    });

    if (footerH > 0) {
      ctx.fillStyle = theme.muted;
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "每一只小猫，都有属于自己的角落。",
        cx,
        env.height - env.insetBottom - footerH / 2 - 2,
      );
    }
  }

  function modalFrame(): Rect {
    const w = Math.min(340, env.width - 28);
    const h = Math.min(460, env.height - 120);
    return { x: (env.width - w) / 2, y: (env.height - h) / 2, w, h };
  }

  function drawHintSheet(ctx: CanvasRenderingContext2DLike): void {
    if (!play || !hint) return;
    const n = play.level.size;
    const padX = 20;
    const cardW = Math.min(360, env.width - padX * 2);
    const cardX = (env.width - cardW) / 2;
    const inner = 20;
    const textW = cardW - inner * 2;

    const applyH = 50;
    const thinkH = 36;
    const gapCardToBtn = 24;
    const gapBtnToThink = 12;

    ctx.fillStyle = "rgba(41,59,82,0.48)";
    ctx.fillRect(0, 0, env.width, env.height);

    const titleLines = wrapText(ctx, hint.title, textW - 36, "800 18px sans-serif");
    const reasonLines = wrapText(ctx, hint.reason, textW, "14px sans-serif");
    const titleBlock = titleLines.length * 24;
    const reasonBlock = reasonLines.length * 21;
    const rowUnit = hint.units?.find((u) => u < n);
    const needLabel = rowUnit !== undefined;
    const labelW = needLabel ? 40 : 0;

    // 整盘 n×n，按可用高度上下居中整块（卡片+按钮）
    const safeTop = env.insetTop + 12;
    const safeBottom = env.height - env.insetBottom - 12;
    const availableH = safeBottom - safeTop;
    const fixedWithoutMini =
      22 +
      titleBlock +
      10 +
      reasonBlock +
      14 +
      12 +
      36 +
      20 +
      gapCardToBtn +
      applyH +
      gapBtnToThink +
      thinkH;
    const maxMiniSide = Math.max(72, availableH - fixedWithoutMini);
    const cellByW = Math.floor((textW - labelW - 12) / n);
    const cellByH = Math.floor((maxMiniSide - 12) / n);
    const cell = Math.max(10, Math.min(34, cellByW, cellByH));
    const miniW = n * cell;
    const miniH = n * cell;
    const cardH = 22 + titleBlock + 10 + reasonBlock + 14 + miniH + 12 + 36 + 20;
    const stackH = cardH + gapCardToBtn + applyH + gapBtnToThink + thinkH;
    let cardY = Math.round((env.height - stackH) / 2);
    if (cardY < safeTop) cardY = safeTop;
    if (cardY + stackH > safeBottom) cardY = Math.max(safeTop, safeBottom - stackH);

    card(ctx, { x: cardX, y: cardY, w: cardW, h: cardH }, 24);

    let y = cardY + 20;
    ctx.fillStyle = theme.ink;
    ctx.font = "800 18px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (const line of titleLines) {
      ctx.fillText(line, cardX + inner, y);
      y += 24;
    }
    const close = addHit("close", {
      x: cardX + cardW - 44,
      y: cardY + 12,
      w: 32,
      h: 32,
    });
    ctx.fillStyle = theme.paperDeep;
    ctx.beginPath();
    ctx.arc(close.x + 16, close.y + 16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "16px sans-serif";
    ctx.fillText("✕", close.x + 16, close.y + 17);

    y += 8;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = theme.ink;
    ctx.font = "14px sans-serif";
    for (const line of reasonLines) {
      ctx.fillText(line, cardX + inner, y);
      y += 21;
    }

    y += 12;
    const miniX = cardX + (cardW - miniW + labelW) / 2;
    const miniY = y;
    fillRound(
      ctx,
      { x: miniX - 6, y: miniY - 6, w: miniW + 12, h: miniH + 12 },
      theme.paperDeep,
      14,
    );

    if (rowUnit !== undefined) {
      const ly = miniY + rowUnit * cell + cell / 2;
      ctx.fillStyle = theme.muted;
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(`第${rowUnit + 1}行`, miniX - 8, ly);
    }

    const gap = Math.max(1, cell * 0.08);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const x = miniX + c * cell + gap / 2;
        const yy = miniY + r * cell + gap / 2;
        const s = cell - gap;
        const rr = Math.min(6, s * 0.28);
        fillRound(
          ctx,
          { x, y: yy, w: s, h: s },
          theme.regions[play.level.regions[r]![c]! % theme.regions.length]!,
          rr,
        );
        if (hint.targets.includes(i)) {
          strokeRound(ctx, { x, y: yy, w: s, h: s }, "#ffffff", rr, Math.max(1.5, cell * 0.08));
        }
        const cellState = play.board[i];
        if (cellState === "cat") {
          ensureCatFaces(play);
          drawMiniCat(ctx, x + s / 2, yy + s / 2, s, 0);
        }
        if (cellState === "markedX") drawMark(ctx, x + s / 2, yy + s / 2, s, false);
        if (cellState === "wrongX") drawMark(ctx, x + s / 2, yy + s / 2, s, true);
        if (hint.sources.includes(i)) {
          const dx = x + s * 0.72;
          const dy = yy + s * 0.72;
          const dr = Math.max(2, s * 0.12);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(dx, dy - dr);
          ctx.lineTo(dx + dr, dy);
          ctx.lineTo(dx, dy + dr);
          ctx.lineTo(dx - dr, dy);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    y = miniY + miniH + 16;
    const legend =
      hint.kind === "place" || hint.kind === "reveal"
        ? hint.sources.length
          ? "白框：放猫位置  ·  ◆：推理依据"
          : "白框：放猫位置"
        : hint.sources.length
          ? "白框：将标记 ×  ·  ◆：推理依据"
          : "白框：将标记 ×";
    ctx.fillStyle = theme.muted;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(legend, cardX + inner, y);

    const applyW = Math.min(320, env.width - 48);
    const apply: Rect = {
      x: (env.width - applyW) / 2,
      y: cardY + cardH + gapCardToBtn,
      w: applyW,
      h: applyH,
    };
    addHit("applyHint", apply);
    fillPrimary(ctx, apply, applyH * 0.5);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 17px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("应用", apply.x + apply.w / 2, apply.y + apply.h / 2);

    const think = addHit("gotIt", {
      x: apply.x,
      y: apply.y + apply.h + gapBtnToThink,
      w: apply.w,
      h: thinkH,
    });
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = "14px sans-serif";
    ctx.fillText("先自己想想", think.x + think.w / 2, think.y + thinkH / 2);
  }

  function drawModal(ctx: CanvasRenderingContext2DLike): void {
    if (!modal) return;
    if (modal === "hint" && hint) {
      drawHintSheet(ctx);
      return;
    }
    ctx.fillStyle = "rgba(41,59,82,0.35)";
    ctx.fillRect(0, 0, env.width, env.height);
    const box = modalFrame();
    card(ctx, box, 26);
    ctx.fillStyle = theme.ink;
    ctx.font = "800 20px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const titles: Record<Exclude<Modal, null>, string> = {
      settings: "舒服地玩",
      help: "给每只猫一个角落",
      rules: "给每只猫一个角落",
      hint: hint?.title ?? "提示",
      result: "都找到啦",
      restart: "重来一局",
      clear: "清除进度",
    };
    ctx.fillText(titles[modal], box.x + 24, box.y + 22);
    const close = addHit("close", { x: box.x + box.w - 48, y: box.y + 16, w: 32, h: 32 });
    ctx.fillStyle = theme.paperDeep;
    ctx.beginPath();
    ctx.arc(close.x + 16, close.y + 16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "16px sans-serif";
    ctx.fillText("✕", close.x + 16, close.y + 17);
    ctx.textBaseline = "top";

    if (modal === "help" || modal === "rules") {
      const rules = [
        { no: "01", text: "每一行、每一列，各有一只猫。" },
        { no: "02", text: "每一种颜色区域，恰好一只猫。" },
        { no: "03", text: "小猫不能相邻，斜对角也不行。" },
      ];
      let y = box.y + 72;
      for (const rule of rules) {
        ctx.textAlign = "left";
        ctx.fillStyle = theme.eyebrow;
        ctx.font = "700 13px sans-serif";
        ctx.fillText(rule.no, box.x + 24, y);
        ctx.fillStyle = theme.ink;
        ctx.font = "15px sans-serif";
        const wrapped = wrapText(ctx, rule.text, box.w - 72, "15px sans-serif");
        let ty = y;
        for (const row of wrapped) {
          ctx.fillText(row, box.x + 56, ty);
          ty += 22;
        }
        y = Math.max(y + 28, ty + 10);
      }
      const tip: Rect = { x: box.x + 24, y: y + 4, w: box.w - 48, h: 56 };
      fillRound(ctx, tip, theme.paperDeep, 14);
      ctx.fillStyle = theme.muted;
      ctx.font = "13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("轻点 = 标记 ×", tip.x + 16, tip.y + 12);
      ctx.fillText("双击 = 尝试放猫", tip.x + 16, tip.y + 32);
      const gotIt = addHit("gotIt", { x: box.x + 24, y: box.y + box.h - 70, w: box.w - 48, h: 46 });
      fillPrimary(ctx, gotIt, 18);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 16px sans-serif";
      ctx.fillText("知道啦", gotIt.x + gotIt.w / 2, gotIt.y + 14);
    }

    if (modal === "settings") {
      ctx.textAlign = "left";
      ctx.fillStyle = theme.muted;
      ctx.font = "14px sans-serif";
      ctx.fillText("调成你喜欢的样子。", box.x + 24, box.y + 56);
      const rows: { key: keyof Settings; label: string; hint: string }[] = [
        { key: "autoMarkEnabled", label: "自动标记", hint: "放对后自动标上 ×" },
        { key: "hapticEnabled", label: "触觉反馈", hint: "轻触时微微震动" },
        { key: "animationsEnabled", label: "动态效果", hint: "柔和的过渡动画" },
      ];
      rows.forEach((row, i) => {
        const y = box.y + 96 + i * 58;
        ctx.textAlign = "left";
        ctx.fillStyle = theme.ink;
        ctx.font = "16px sans-serif";
        ctx.fillText(row.label, box.x + 24, y);
        ctx.fillStyle = theme.muted;
        ctx.font = "12px sans-serif";
        ctx.fillText(row.hint, box.x + 24, y + 22);
        const sw = addHit(`set:${row.key}`, { x: box.x + box.w - 78, y: y + 4, w: 50, h: 30 });
        fillRound(ctx, sw, settings[row.key] ? theme.accent : theme.line, 15);
        ctx.fillStyle = theme.cream;
        ctx.beginPath();
        ctx.arc(settings[row.key] ? sw.x + 34 : sw.x + 16, sw.y + 15, 10, 0, Math.PI * 2);
        ctx.fill();
      });
      const wipe = addHit("wipe", { x: box.x + 24, y: box.y + box.h - 88, w: box.w - 48, h: 36 });
      ctx.textAlign = "center";
      ctx.fillStyle = theme.wrong;
      ctx.font = "15px sans-serif";
      ctx.fillText("清除所有游戏进度", wipe.x + wipe.w / 2, wipe.y + 8);
      ctx.fillStyle = theme.muted;
      ctx.font = "11px sans-serif";
      ctx.fillText("Purrdoku · 各就喵位", env.width / 2, box.y + box.h - 28);
    }

    if (modal === "result" && play) {
      const result = resultOf(play);
      ctx.textAlign = "center";
      ctx.fillStyle = theme.ink;
      ctx.font = "16px sans-serif";
      ctx.fillText(`${play.level.size} 只猫都找到了角落`, env.width / 2, box.y + 84);
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
        fillPrimary(ctx, go, 18);
        if (generationError) {
          ctx.fillStyle = theme.wrong;
          ctx.font = "12px sans-serif";
          ctx.fillText(generationError, env.width / 2, go.y - 28);
        }
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 16px sans-serif";
        ctx.fillText(
          preparingPuzzle ? "准备中…" : generationError ? "重试" : "下一关",
          go.x + go.w / 2,
          go.y + 14,
        );
      }
    }

    if (modal === "restart") {
      ctx.textAlign = "left";
      ctx.font = "15px sans-serif";
      ctx.fillStyle = theme.ink;
      ctx.fillText("同一题从头再来，当前失误会清零。", box.x + 24, box.y + 90);
      const ok = addHit("doRestart", { x: box.x + 24, y: box.y + box.h - 70, w: box.w - 48, h: 46 });
      fillPrimary(ctx, ok, 18);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 16px sans-serif";
      ctx.fillText("确定重来", ok.x + ok.w / 2, ok.y + 14);
    }

    if (modal === "clear") {
      ctx.textAlign = "left";
      ctx.font = "15px sans-serif";
      ctx.fillStyle = theme.ink;
      ctx.fillText("会清掉闯关、每日和统计，不能恢复。", box.x + 24, box.y + 90);
      const ok = addHit("doClear", { x: box.x + 24, y: box.y + box.h - 70, w: box.w - 48, h: 46 });
      fillPrimary(ctx, ok, 18);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 16px sans-serif";
      ctx.fillText("确定清除", ok.x + ok.w / 2, ok.y + 14);
    }
  }

  function tap(id: string): void {
    if (id === "close" || id === "gotIt") {
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
    if (id === "undo" && play) {
      const before = play.board.slice();
      if (undo(play)) recordBoardMotion(before);
    }
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
      const before = play.board.slice();
      if (applyHint(play, hint)) recordBoardMotion(before);
      if (play.completed) onWin();
      else modal = null;
      hint = null;
    }
    if (id === "next") void nextInfinite();
    if (id === "doRestart" && play) {
      restart(play, mode);
      clearBoardMotion();
      modal = null;
    }
    if (id === "wipe") modal = "clear";
    if (id === "doClear") {
      settings = defaultSettings();
      shell = { settings, daily: {} };
      infinite = {
        versions: { ...CURRENT_VERSIONS },
        playerSeed: newSeed(),
        ordinal: 0,
        play: null,
        stats: { completed: 0, independent: 0, flawless: 0 },
        history: [],
        sizeCounts: { 6: 0, 7: 0, 8: 0, 9: 0 },
      };
      play = null;
      preparedPuzzle = null;
      puzzleQueue.clear();
      preparingPuzzle = false;
      generationError = "";
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
    if (kind === "start") {
      if (activeTouchId !== null) return;
      activeTouchId = id;
    } else if (activeTouchId !== id) {
      return;
    }
    try {
      if (kind === "cancel") {
        gestures.cancel(id);
        if (uiPress?.touchId === id) uiPress = null;
        previewPath = null;
        pressedCell = null;
        return;
      }
      if (modal) {
        if (kind === "start" && !uiPress) uiPress = beginPress(hits, x, y, id);
        if (kind === "move") uiPress = keepPress(uiPress, hits, x, y, id);
        if (kind === "end") {
          const target = releasePress(uiPress, hits, x, y, id);
          if (uiPress?.touchId === id) uiPress = null;
          if (target) tap(target);
        }
        return;
      }
      if (scene === "home") {
        if (kind === "start" && !uiPress) uiPress = beginPress(hits, x, y, id);
        if (kind === "move") uiPress = keepPress(uiPress, hits, x, y, id);
        if (kind === "end") {
          const target = releasePress(uiPress, hits, x, y, id);
          if (uiPress?.touchId === id) uiPress = null;
          if (target) tap(target);
        }
        return;
      }
      const cell = cellAt(x, y);
      if (cell !== null && play && !play.completed) {
        if (kind === "start") {
          pressedCell = cell;
          gestures.start(cell, id);
        }
        if (kind === "move") gestures.move(cell, id);
        if (kind === "end") {
          gestures.move(cell, id);
          gestures.end(id);
          pressedCell = null;
        }
        focus = cell;
        return;
      }
      if (kind === "start") {
        gestures.cancel(id);
        if (!uiPress) uiPress = beginPress(hits, x, y, id);
      }
      if (kind === "move") uiPress = keepPress(uiPress, hits, x, y, id);
      if (kind === "end") {
        gestures.cancel(id);
        previewPath = null;
        pressedCell = null;
        const target = releasePress(uiPress, hits, x, y, id);
        if (uiPress?.touchId === id) uiPress = null;
        if (target) tap(target);
      }
    } finally {
      if (kind === "end" || kind === "cancel") activeTouchId = null;
    }
  }

  function key(code: string): void {
    if (modal || scene !== "play" || !play || play.completed) return;
    const n = play.level.size;
    if (code === "ArrowLeft") focus = Math.max(0, focus - 1);
    if (code === "ArrowRight") focus = Math.min(n * n - 1, focus + 1);
    if (code === "ArrowUp") focus = Math.max(0, focus - n);
    if (code === "ArrowDown") focus = Math.min(n * n - 1, focus + n);
    const before = play.board.slice();
    const mistakesBefore = play.mistakes;
    let changed = false;
    if (code === "Space") changed = toggleCell(play, focus);
    if (code === "Enter") {
      changed = placeOn(play, focus);
      if (play.completed) onWin();
    }
    if (changed) recordBoardMotion(before, code === "Enter" ? focus : null, mistakesBefore);
    persist();
  }

  function draw(): void {
    const ctx = env.ctx;
    hits = [];
    try {
      paintPaper(ctx, env.width, env.height);
      if (scene === "home") drawHome(ctx);
      else drawPlay(ctx);
      if (modal) hits = [];
      drawModal(ctx);
      if (uiPress) {
        const pressed = [...hits].reverse().find((target) => target.id === uiPress!.id);
        if (pressed) {
          fillRound(ctx, pressed.rect, "rgba(41,59,82,0.07)", Math.min(16, pressed.rect.h / 2));
        }
      }
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
    if (visible) motionTime += dt * 1000;
    if (visible && !modal) visualTime += dt * 1000;
    const counting = visible && scene === "play" && !!play && !play.completed && !modal;
    if (play) tickPlay(play, dt, counting);
    draw();
    requestAnimationFrame(loop);
  }

  wx.onTouchStart((e) => {
    for (const t of e.changedTouches) pointer("start", t.clientX, t.clientY, t.identifier);
  });
  wx.onTouchMove((e) => {
    for (const t of e.changedTouches) pointer("move", t.clientX, t.clientY, t.identifier);
  });
  wx.onTouchEnd((e) => {
    for (const t of e.changedTouches) pointer("end", t.clientX, t.clientY, t.identifier);
  });
  wx.onTouchCancel((e) => {
    for (const t of e.changedTouches) pointer("cancel", t.clientX, t.clientY, t.identifier);
  });
  wx.onKeyDown?.((e) => key(e.code || e.key || ""));
  wx.onHide(() => {
    visible = false;
    gestures.cancel();
    uiPress = null;
    activeTouchId = null;
    previewPath = null;
    pressedCell = null;
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
