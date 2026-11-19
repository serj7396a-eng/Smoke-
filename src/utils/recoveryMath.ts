import { STAGES_DATA } from '../data/stagesData';
import {
  AspectMilestoneNote,
  AspectPoint,
  AuraPhase,
  CommunityVoice,
  ElapsedTimeBreakdown,
  RecoveryAspect,
  RecoveryStage,
  StageId,
  StageProgressInfo,
  TimeMachineMode
} from '../types';

export const CHART_AXIS_TICKS = [
  { day: 0, norm: 0, label: 'Старт' },
  { day: 3, norm: 1 / 6, label: '3д' },
  { day: 6, norm: 2 / 6, label: '6д' },
  { day: 14, norm: 3 / 6, label: '14д' },
  { day: 21, norm: 4 / 6, label: '21д' },
  { day: 30, norm: 5 / 6, label: '30д' },
  { day: 90, norm: 1.0, label: '90д' }
] as const;

export type ChartGestureIntent = 'pending' | 'scroll-vertical' | 'scrub-horizontal';

/**
 * Strict Gesture Intent Filter for touch charts:
 * - Waits until finger delta exceeds 12px before deciding.
 * - If |dy| > |dx| * 0.7 (or not strictly horizontal |dx| > |dy| * 2.0),
 *   locks out chart scrubbing so vertical scrolling stays 100% native and jump-free.
 */
export function classifyChartGestureIntent(dx: number, dy: number): ChartGestureIntent {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.hypot(absX, absY) <= 12) {
    return 'pending';
  }
  if (absY > absX * 0.7) {
    return 'scroll-vertical';
  }
  if (absX > absY * 2.0) {
    return 'scrub-horizontal';
  }
  return 'scroll-vertical';
}

export function pluralizeRu(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(Math.floor(count));
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 > 10 && mod100 < 20) return forms[2];
  if (mod10 > 1 && mod10 < 5) return forms[1];
  if (mod10 === 1) return forms[0];
  return forms[2];
}

export function computeElapsedBreakdown(
  quitTimestampMs: number,
  nowMs: number
): ElapsedTimeBreakdown {
  const elapsedMs = Math.max(0, nowMs - quitTimestampMs);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const elapsedHours = elapsedMs / 3_600_000;
  const elapsedDays = elapsedMs / 86_400_000;

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    elapsedMs,
    totalSeconds,
    elapsedHours,
    elapsedDays,
    days,
    hours,
    minutes,
    seconds,
    formattedTwoDigitHours: String(hours).padStart(2, '0'),
    formattedTwoDigitMinutes: String(minutes).padStart(2, '0'),
    formattedTwoDigitSeconds: String(seconds).padStart(2, '0')
  };
}

export function resolveAuraPhase(elapsedDays: number): AuraPhase {
  const safeHours = Math.max(0, elapsedDays * 24);
  if (safeHours < 48) return 'acute';
  if (safeHours < 336) return 'peak';
  return 'clean';
}

/**
 * Gapless [minHours, maxHours) contiguous resolver across all 19 CNS stages.
 */
export function resolveLiveStageIndex(elapsedHours: number): number {
  const safeHours = Number.isFinite(elapsedHours) ? Math.max(0, elapsedHours) : 0;
  for (let i = 0; i < STAGES_DATA.length; i++) {
    const stage = STAGES_DATA[i];
    if (safeHours >= stage.minHours && safeHours < stage.maxHours) {
      return i;
    }
  }
  return STAGES_DATA.length - 1;
}

export function resolveStageFromHours(elapsedHours: number): RecoveryStage {
  return STAGES_DATA[resolveLiveStageIndex(elapsedHours)];
}

export function resolveStageFromDays(elapsedDays: number): RecoveryStage {
  return resolveStageFromHours(Math.max(0, elapsedDays) * 24);
}

export function formatDurationHoursRu(hoursInput: number): string {
  const safeHours = Math.max(0, hoursInput);
  if (safeHours < 48) {
    const totalMinutes = Math.max(1, Math.round(safeHours * 60));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}м`;
    if (m === 0) return `${h}ч`;
    return `${h}ч ${m}м`;
  }
  const totalHours = Math.max(1, Math.round(safeHours));
  const d = Math.floor(totalHours / 24);
  const h = totalHours % 24;
  if (h === 0) return `${d}д`;
  return `${d}д ${h}ч`;
}

/**
 * Computes real-time completion % and Russian countdown text for any stage index.
 */
export function resolveStageProgressInfo(
  stageIndex: number,
  liveElapsedHours: number
): StageProgressInfo {
  const clampedIdx = Math.min(
    STAGES_DATA.length - 1,
    Math.max(0, Math.floor(stageIndex))
  );
  const stage = STAGES_DATA[clampedIdx];
  const safeHours = Number.isFinite(liveElapsedHours)
    ? Math.max(0, liveElapsedHours)
    : 0;

  if (safeHours < stage.minHours) {
    const untilStart = formatDurationHoursRu(stage.minHours - safeHours);
    return {
      progressPct: 0,
      statusText: `Предпросмотр · До «${stage.shortLabel}» осталось ${untilStart}`,
      isCurrentLive: false,
      isCompleted: false,
      isFuture: true
    };
  }

  if (Number.isFinite(stage.maxHours) && safeHours >= stage.maxHours) {
    return {
      progressPct: 100,
      statusText: 'Пройдено 100% этапа · Рубеж успешно закрыт',
      isCurrentLive: false,
      isCompleted: true,
      isFuture: false
    };
  }

  // Currently inside [minHours, maxHours)
  if (!Number.isFinite(stage.maxHours)) {
    const sovereignTargetHours = 2160; // 90 days
    if (safeHours >= sovereignTargetHours) {
      return {
        progressPct: 100,
        statusText: 'Эталон 90+ суток достигнут · 100% суверенная ЦНС',
        isCurrentLive: true,
        isCompleted: true,
        isFuture: false
      };
    }
    const span = sovereignTargetHours - stage.minHours;
    const pct = Math.min(
      99,
      Math.max(1, Math.round(((safeHours - stage.minHours) / span) * 100))
    );
    const rem = formatDurationHoursRu(sovereignTargetHours - safeHours);
    return {
      progressPct: pct,
      statusText: `Пройдено ${pct}% финала · До эталона 90 суток осталось ${rem}`,
      isCurrentLive: true,
      isCompleted: false,
      isFuture: false
    };
  }

  const spanHours = Math.max(0.001, stage.maxHours - stage.minHours);
  const rawPct = ((safeHours - stage.minHours) / spanHours) * 100;
  const progressPct = Math.min(100, Math.max(0, Math.round(rawPct)));
  const nextStage = STAGES_DATA[Math.min(STAGES_DATA.length - 1, clampedIdx + 1)];
  const remainingFormatted = formatDurationHoursRu(stage.maxHours - safeHours);

  return {
    progressPct,
    statusText: `Пройдено ${progressPct}% этапа · До «${nextStage.shortLabel}» осталось ${remainingFormatted}`,
    isCurrentLive: true,
    isCompleted: false,
    isFuture: false
  };
}

/**
 * Single source of truth resolver supporting both previewStageIndex (number | null)
 * and legacy TimeMachineMode ('live' | StageId).
 */
export function resolveActiveContext(
  modeOrPreviewIndex: TimeMachineMode | number | null,
  liveElapsedDays: number
): {
  liveStageIndex: number;
  activeStageIndex: number;
  activeStage: RecoveryStage;
  effectiveDay: number;
  auraPhase: AuraPhase;
  isLive: boolean;
} {
  const safeDays = Number.isFinite(liveElapsedDays) ? Math.max(0, liveElapsedDays) : 0;
  const liveElapsedHours = safeDays * 24;
  const liveStageIndex = resolveLiveStageIndex(liveElapsedHours);

  if (modeOrPreviewIndex === null || modeOrPreviewIndex === 'live') {
    const activeStage = STAGES_DATA[liveStageIndex];
    const clampedDay = Math.min(90, safeDays);
    return {
      liveStageIndex,
      activeStageIndex: liveStageIndex,
      activeStage,
      effectiveDay: clampedDay,
      auraPhase: activeStage.auraPhase,
      isLive: true
    };
  }

  if (typeof modeOrPreviewIndex === 'number') {
    const clampedIdx = Math.min(
      STAGES_DATA.length - 1,
      Math.max(0, Math.floor(modeOrPreviewIndex))
    );
    const found = STAGES_DATA[clampedIdx];
    return {
      liveStageIndex,
      activeStageIndex: clampedIdx,
      activeStage: found,
      effectiveDay: found.representativeDay,
      auraPhase: found.auraPhase,
      isLive: false
    };
  }

  const foundIdx = STAGES_DATA.findIndex((s) => s.id === modeOrPreviewIndex);
  const safeIdx = foundIdx >= 0 ? foundIdx : 0;
  const found = STAGES_DATA[safeIdx];
  return {
    liveStageIndex,
    activeStageIndex: safeIdx,
    activeStage: found,
    effectiveDay: found.representativeDay,
    auraPhase: found.auraPhase,
    isLive: false
  };
}

export function dayToNormalizedX(day: number): number {
  const clamped = Math.min(90, Math.max(0, day));
  for (let i = 0; i < CHART_AXIS_TICKS.length - 1; i++) {
    const left = CHART_AXIS_TICKS[i];
    const right = CHART_AXIS_TICKS[i + 1];
    if (clamped >= left.day && clamped <= right.day) {
      const span = right.day - left.day;
      const ratio = span === 0 ? 0 : (clamped - left.day) / span;
      return left.norm + ratio * (right.norm - left.norm);
    }
  }
  return 1;
}

export function normalizedXToDay(norm: number): number {
  const clamped = Math.min(1, Math.max(0, norm));
  for (let i = 0; i < CHART_AXIS_TICKS.length - 1; i++) {
    const left = CHART_AXIS_TICKS[i];
    const right = CHART_AXIS_TICKS[i + 1];
    if (clamped >= left.norm && clamped <= right.norm) {
      const span = right.norm - left.norm;
      const ratio = span === 0 ? 0 : (clamped - left.norm) / span;
      return left.day + ratio * (right.day - left.day);
    }
  }
  return 90;
}

/**
 * Computes Fritsch-Carlson monotone cubic tangents on 1D arrays xs (strictly increasing) and ys.
 */
function computeMonotoneTangents(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  if (n < 2) return new Array(n).fill(0);

  const dxs: number[] = [];
  const dys: number[] = [];
  const slopes: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    const dy = ys[i + 1] - ys[i];
    dxs.push(dx);
    dys.push(dy);
    slopes.push(dx === 0 ? 0 : dy / dx);
  }

  const tangents: number[] = new Array(n).fill(0);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    const m0 = slopes[i - 1];
    const m1 = slopes[i];
    if (m0 * m1 <= 0) {
      tangents[i] = 0;
    } else {
      const dx0 = dxs[i - 1];
      const dx1 = dxs[i];
      const common = dx0 + dx1;
      tangents[i] =
        (3 * common) / ((common + dx1) / m0 + (common + dx0) / m1);
    }
  }

  return tangents;
}

export function interpolateAspectValue(
  points: AspectPoint[],
  day: number,
  yDomain: [number, number] = [0, 100]
): number {
  if (points.length === 0) return yDomain[0];
  const [minY, maxY] = yDomain;
  const clampedDay = Math.min(90, Math.max(0, day));
  if (clampedDay <= points[0].day) return points[0].value;
  if (clampedDay >= points[points.length - 1].day) {
    return points[points.length - 1].value;
  }

  const xs = points.map((p) => dayToNormalizedX(p.day));
  const ys = points.map((p) => p.value);
  const tangents = computeMonotoneTangents(xs, ys);
  const targetX = dayToNormalizedX(clampedDay);

  for (let i = 0; i < xs.length - 1; i++) {
    if (targetX >= xs[i] && targetX <= xs[i + 1]) {
      const h = xs[i + 1] - xs[i];
      if (h === 0) return ys[i];
      const t = (targetX - xs[i]) / h;
      const t2 = t * t;
      const t3 = t2 * t;

      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      const interpolated =
        h00 * ys[i] +
        h10 * h * tangents[i] +
        h01 * ys[i + 1] +
        h11 * h * tangents[i + 1];

      return Math.min(maxY, Math.max(minY, Math.round(interpolated)));
    }
  }

  return points[points.length - 1].value;
}

export interface ChartGeometry {
  viewWidth: number;
  viewHeight: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

export const DEFAULT_CHART_GEOMETRY: ChartGeometry = {
  viewWidth: 360,
  viewHeight: 168,
  padLeft: 20,
  padRight: 20,
  padTop: 20,
  padBottom: 26
};

export function mapPointToSvg(
  day: number,
  value: number,
  geom: ChartGeometry = DEFAULT_CHART_GEOMETRY,
  yDomain: [number, number] = [0, 100]
): { x: number; y: number } {
  const [minY, maxY] = yDomain;
  const spanY = Math.max(1, maxY - minY);
  const usableWidth = geom.viewWidth - geom.padLeft - geom.padRight;
  const usableHeight = geom.viewHeight - geom.padTop - geom.padBottom;
  const normX = dayToNormalizedX(day);
  const clampedVal = Math.min(maxY, Math.max(minY, value));
  const normY = (clampedVal - minY) / spanY;
  const x = geom.padLeft + normX * usableWidth;
  const y = geom.padTop + (1 - normY) * usableHeight;
  return { x, y };
}

export function buildSplineSvgPaths(
  points: AspectPoint[],
  geom: ChartGeometry = DEFAULT_CHART_GEOMETRY,
  yDomain: [number, number] = [0, 100]
): { strokePath: string; areaPath: string } {
  if (points.length === 0) {
    return { strokePath: '', areaPath: '' };
  }

  const coords = points.map((p) => mapPointToSvg(p.day, p.value, geom, yDomain));
  const xs = coords.map((c) => c.x);
  const ys = coords.map((c) => c.y);
  const tangents = computeMonotoneTangents(xs, ys);

  let d = `M ${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    const cp1x = xs[i] + dx / 3;
    const cp1y = ys[i] + (tangents[i] * dx) / 3;
    const cp2x = xs[i + 1] - dx / 3;
    const cp2y = ys[i + 1] - (tangents[i + 1] * dx) / 3;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${xs[i + 1].toFixed(2)} ${ys[i + 1].toFixed(2)}`;
  }

  const baselineY = geom.viewHeight - geom.padBottom;
  const areaPath = `${d} L ${xs[xs.length - 1].toFixed(2)} ${baselineY.toFixed(2)} L ${xs[0].toFixed(2)} ${baselineY.toFixed(2)} Z`;

  return { strokePath: d, areaPath };
}

export function getScrubberMilestoneNote(
  aspect: RecoveryAspect,
  day: number
): AspectMilestoneNote {
  const clamped = Math.min(90, Math.max(0, day));
  for (const note of aspect.scrubberNotes) {
    if (clamped >= note.minDay && clamped <= note.maxDay) {
      return note;
    }
  }
  return aspect.scrubberNotes[aspect.scrubberNotes.length - 1];
}

export function formatRussianDayLabel(day: number): string {
  const clamped = Math.min(90, Math.max(0, day));
  if (clamped < 0.04) {
    return 'Старт · 0ч';
  }
  if (clamped < 1) {
    const hours = Math.max(1, Math.round(clamped * 24));
    return `${hours} ${pluralizeRu(hours, ['час', 'часа', 'часов'])}`;
  }
  if (clamped < 10) {
    const roundedHalf = Math.round(clamped * 2) / 2;
    if (Number.isInteger(roundedHalf)) {
      return `День ${roundedHalf}`;
    }
    return `День ${String(roundedHalf).replace('.', ',')}`;
  }
  return `День ${Math.round(clamped)}`;
}

export function isVoiceInStageWindow(
  voice: CommunityVoice,
  stage: RecoveryStage
): boolean {
  if (voice.stageId === stage.id) return true;
  const voiceHours = voice.day * 24;
  return voiceHours >= stage.minHours && voiceHours < stage.maxHours;
}

export function getMatchedVoices(
  voices: CommunityVoice[],
  stageId: StageId,
  effectiveDay: number
): { primary: CommunityVoice[]; nearby: CommunityVoice[] } {
  const stage = STAGES_DATA.find((s) => s.id === stageId) ?? STAGES_DATA[0];
  const targetDay = Number.isFinite(effectiveDay)
    ? effectiveDay
    : stage.representativeDay;

  const inWindow = voices
    .filter((v) => isVoiceInStageWindow(v, stage))
    .sort((a, b) => Math.abs(a.day - targetDay) - Math.abs(b.day - targetDay));

  const outside = voices
    .filter((v) => !isVoiceInStageWindow(v, stage))
    .sort((a, b) => Math.abs(a.day - targetDay) - Math.abs(b.day - targetDay));

  if (inWindow.length >= 6) {
    return {
      primary: inWindow,
      nearby: outside.slice(0, 4)
    };
  }

  const needed = Math.max(0, 8 - inWindow.length);
  return {
    primary: [...inWindow, ...outside.slice(0, needed)],
    nearby: outside.slice(needed, needed + 4)
  };
}

export function buildMiniSparkline(
  points: AspectPoint[],
  effectiveDay: number,
  width = 84,
  height = 24,
  yDomain: [number, number] = [0, 100]
): { strokePath: string; dotX: number; dotY: number } {
  const geom: ChartGeometry = {
    viewWidth: width,
    viewHeight: height,
    padLeft: 3,
    padRight: 3,
    padTop: 4,
    padBottom: 4
  };
  const { strokePath } = buildSplineSvgPaths(points, geom, yDomain);
  const clampedDay = Math.min(90, Math.max(0, effectiveDay));
  const val = interpolateAspectValue(points, clampedDay, yDomain);
  const { x: dotX, y: dotY } = mapPointToSvg(clampedDay, val, geom, yDomain);
  return { strokePath, dotX, dotY };
}

export function wrapDeckIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}
