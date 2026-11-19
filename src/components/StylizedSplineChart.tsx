import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AspectPoint, RecoveryAspect, TimeMachineMode } from '../types';
import {
  CHART_AXIS_TICKS,
  ChartGeometry,
  classifyChartGestureIntent,
  formatRussianDayLabel,
  getScrubberMilestoneNote,
  interpolateAspectValue,
  mapPointToSvg,
  normalizedXToDay
} from '../utils/recoveryMath';

interface StylizedSplineChartProps {
  aspect: RecoveryAspect;
  effectiveDay: number;
  mode: TimeMachineMode;
}

const CHART_GEOM: ChartGeometry = {
  viewWidth: 360,
  viewHeight: 178,
  padLeft: 24,
  padRight: 24,
  padTop: 20,
  padBottom: 24
};

function buildSmoothCubicPaths(
  points: AspectPoint[],
  geom: ChartGeometry,
  yDomain: [number, number]
): {
  strokePath: string;
  areaToBottomPath: string;
  coords: { x: number; y: number; day: number; val: number }[];
} {
  const segments = 28;
  const coords: { x: number; y: number; day: number; val: number }[] = [];

  for (let i = 0; i <= segments; i++) {
    const norm = i / segments;
    const day = normalizedXToDay(norm);
    const val = interpolateAspectValue(points, day, yDomain);
    const pt = mapPointToSvg(day, val, geom, yDomain);
    coords.push({ x: pt.x, y: pt.y, day, val });
  }

  let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < segments; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(segments, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  const baselineY = geom.viewHeight - geom.padBottom;
  const last = coords[coords.length - 1];
  const first = coords[0];
  const areaToBottomPath = `${d} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;

  return { strokePath: d, areaToBottomPath, coords };
}

function buildBandBetweenCoords(
  upper: { x: number; y: number }[],
  lower: { x: number; y: number }[]
): string {
  if (upper.length === 0 || lower.length === 0) return '';
  let d = `M ${upper[0].x.toFixed(2)} ${upper[0].y.toFixed(2)}`;
  for (let i = 1; i < upper.length; i++) {
    d += ` L ${upper[i].x.toFixed(2)} ${upper[i].y.toFixed(2)}`;
  }
  for (let i = lower.length - 1; i >= 0; i--) {
    d += ` L ${lower[i].x.toFixed(2)} ${lower[i].y.toFixed(2)}`;
  }
  return `${d} Z`;
}

function buildSteppedPath(
  points: AspectPoint[],
  geom: ChartGeometry,
  yDomain: [number, number]
): { stepStroke: string; stepArea: string } {
  const stepDays = [0, 0.5, 1.5, 3, 6, 10, 14, 21, 30, 52, 90];
  const pts = stepDays.map((day) => {
    const val = interpolateAspectValue(points, day, yDomain);
    return mapPointToSvg(day, val, geom, yDomain);
  });

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    d += ` L ${pts[i + 1].x.toFixed(2)} ${pts[i].y.toFixed(2)} L ${pts[i + 1].x.toFixed(2)} ${pts[i + 1].y.toFixed(2)}`;
  }
  const bottomY = geom.viewHeight - geom.padBottom;
  const stepArea = `${d} L ${pts[pts.length - 1].x.toFixed(2)} ${bottomY.toFixed(2)} L ${pts[0].x.toFixed(2)} ${bottomY.toFixed(2)} Z`;
  return { stepStroke: d, stepArea };
}

export const StylizedSplineChart: React.FC<StylizedSplineChartProps> = ({
  aspect,
  effectiveDay,
  mode
}) => {
  const rawUid = useId().replace(/:/g, '');
  const areaGradId = `area-grad-${rawUid}`;
  const secondaryGradId = `sec-grad-${rawUid}`;
  const glowFilterId = `glow-${rawUid}`;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  // Strict Gesture Intent Filter state stored in ref (zero re-renders during vertical scroll!)
  const gestureRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    intent: 'idle' | 'pending' | 'scroll-vertical' | 'scrub-horizontal';
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    intent: 'idle'
  });

  const [scrubDay, setScrubDay] = useState<number | null>(null);

  // Reset scrub state when user changes Time Machine stage or switches biomarker system
  useEffect(() => {
    setScrubDay(null);
    gestureRef.current.intent = 'idle';
  }, [mode, aspect.id]);

  const yDomain = aspect.yDomain;
  const bottomAxisY = CHART_GEOM.viewHeight - CHART_GEOM.padBottom;
  const usableWidth =
    CHART_GEOM.viewWidth - CHART_GEOM.padLeft - CHART_GEOM.padRight;

  const mainPaths = useMemo(
    () => buildSmoothCubicPaths(aspect.points, CHART_GEOM, yDomain),
    [aspect.points, yDomain]
  );

  const basePaths = useMemo(
    () => buildSmoothCubicPaths(aspect.baselinePoints, CHART_GEOM, yDomain),
    [aspect.baselinePoints, yDomain]
  );

  const secondaryPaths = useMemo(
    () =>
      aspect.secondarySeries
        ? buildSmoothCubicPaths(aspect.secondarySeries, CHART_GEOM, yDomain)
        : null,
    [aspect.secondarySeries, yDomain]
  );

  const tertiaryPaths = useMemo(
    () =>
      aspect.tertiarySeries
        ? buildSmoothCubicPaths(aspect.tertiarySeries, CHART_GEOM, yDomain)
        : null,
    [aspect.tertiarySeries, yDomain]
  );

  const steppedPaths = useMemo(
    () =>
      aspect.chartVariant === 'stepped-atp-hybrid'
        ? buildSteppedPath(aspect.points, CHART_GEOM, yDomain)
        : null,
    [aspect.chartVariant, aspect.points, yDomain]
  );

  const shearBars = useMemo(() => {
    if (aspect.chartVariant !== 'velocity-shear-bars') return [];
    const series = aspect.secondarySeries ?? aspect.points;
    const count = 16;
    const bars: { x: number; y: number; h: number }[] = [];
    for (let i = 0; i < count; i++) {
      const norm = (i + 0.5) / count;
      const day = normalizedXToDay(norm);
      const val = interpolateAspectValue(series, day, yDomain);
      const pt = mapPointToSvg(day, val, CHART_GEOM, yDomain);
      bars.push({
        x: pt.x,
        y: pt.y,
        h: Math.max(2, bottomAxisY - pt.y)
      });
    }
    return bars;
  }, [aspect.chartVariant, aspect.secondarySeries, aspect.points, yDomain, bottomAxisY]);

  const thresholdY = useMemo(() => {
    if (aspect.targetThresholdValue === undefined) return null;
    return mapPointToSvg(0, aspect.targetThresholdValue, CHART_GEOM, yDomain).y;
  }, [aspect.targetThresholdValue, yDomain]);

  // Band fills for specialized chart types
  const specializedBandPath = useMemo(() => {
    if (aspect.chartVariant === 'inverted-downregulation' && thresholdY !== null) {
      const targetLineCoords = mainPaths.coords.map((c) => ({ x: c.x, y: thresholdY }));
      return buildBandBetweenCoords(mainPaths.coords, targetLineCoords);
    }
    if (aspect.chartVariant === 'dual-spline-shield') {
      return buildBandBetweenCoords(mainPaths.coords, basePaths.coords);
    }
    if (aspect.chartVariant === 'vascular-corridor-band' && secondaryPaths) {
      return buildBandBetweenCoords(mainPaths.coords, secondaryPaths.coords);
    }
    return '';
  }, [aspect.chartVariant, thresholdY, mainPaths.coords, basePaths.coords, secondaryPaths]);

  const dryHypotensionBandPath = useMemo(() => {
    if (aspect.chartVariant === 'vascular-corridor-band' && tertiaryPaths) {
      return buildBandBetweenCoords(basePaths.coords, tertiaryPaths.coords);
    }
    return '';
  }, [aspect.chartVariant, basePaths.coords, tertiaryPaths]);

  const displayDay =
    scrubDay !== null ? scrubDay : Math.min(90, Math.max(0, effectiveDay));

  const displayValue = useMemo(
    () => interpolateAspectValue(aspect.points, displayDay, yDomain),
    [aspect.points, displayDay, yDomain]
  );

  const baselineDisplayValue = useMemo(
    () => interpolateAspectValue(aspect.baselinePoints, displayDay, yDomain),
    [aspect.baselinePoints, displayDay, yDomain]
  );

  const rawDelta = displayValue - baselineDisplayValue;
  const advantageMagnitude = aspect.invertDeltaGood ? -rawDelta : rawDelta;

  const activeCoord = useMemo(
    () => mapPointToSvg(displayDay, displayValue, CHART_GEOM, yDomain),
    [displayDay, displayValue, yDomain]
  );

  const baselineCoord = useMemo(
    () => mapPointToSvg(displayDay, baselineDisplayValue, CHART_GEOM, yDomain),
    [displayDay, baselineDisplayValue, yDomain]
  );

  const milestoneNote = useMemo(
    () => getScrubberMilestoneNote(aspect, displayDay),
    [aspect, displayDay]
  );

  const applyClientXToScrub = (clientX: number, element: Element | null) => {
    const targetEl = element ?? svgRef.current;
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    if (rect.width <= 0) return;

    if (targetEl === svgRef.current) {
      const svgX = ((clientX - rect.left) / rect.width) * CHART_GEOM.viewWidth;
      const norm = Math.min(
        1,
        Math.max(0, (svgX - CHART_GEOM.padLeft) / usableWidth)
      );
      setScrubDay(normalizedXToDay(norm));
    } else {
      const norm = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      setScrubDay(normalizedXToDay(norm));
    }
  };

  // Strict Gesture Intent Filter: NEVER move cursor on pointerDown; wait >12px and abort if vertical!
  const handleFilteredPointerDown = (e: React.PointerEvent<HTMLElement | SVGSVGElement>) => {
    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      intent: 'pending'
    };
  };

  const handleFilteredPointerMove = (
    e: React.PointerEvent<HTMLElement | SVGSVGElement>,
    sourceEl: Element | null
  ) => {
    const g = gestureRef.current;
    if (g.intent === 'idle' || g.intent === 'scroll-vertical') {
      return;
    }

    if (g.intent === 'pending') {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      const classified = classifyChartGestureIntent(dx, dy);
      if (classified === 'pending') {
        return;
      }
      if (classified === 'scroll-vertical') {
        g.intent = 'scroll-vertical';
        return;
      }
      g.intent = 'scrub-horizontal';
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore synthetic event capture errors
      }
    }

    if (g.intent === 'scrub-horizontal') {
      applyClientXToScrub(e.clientX, sourceEl);
    }
  };

  const handleFilteredPointerEnd = () => {
    gestureRef.current.intent = 'idle';
    gestureRef.current.pointerId = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const current = scrubDay ?? effectiveDay;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setScrubDay(Math.min(90, current + (current < 7 ? 0.5 : 3)));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setScrubDay(Math.max(0, current - (current <= 7 ? 0.5 : 3)));
    } else if (e.key === 'Escape') {
      setScrubDay(null);
    }
  };

  const isScrubActive = scrubDay !== null;
  const activeNormPercent =
    ((activeCoord.x - CHART_GEOM.padLeft) / usableWidth) * 100;

  return (
    <div
      data-testid={`chart-card-${aspect.id}`}
      data-scrub-active={isScrubActive ? 'true' : 'false'}
      data-display-day={displayDay.toFixed(2)}
      style={{ touchAction: 'pan-y' }}
      className="relative select-none"
    >
      {/* 1) PERMANENTLY DOCKED FIXED-HEIGHT (h-[68px]) FROSTED TELEMETRY BAR (0px Layout Shift!) */}
      <div
        data-testid="fixed-telemetry-bar"
        className="h-[68px] rounded-2xl bg-[#0c0c13]/92 border border-white/[0.09] px-3.5 py-2 flex flex-col justify-between mb-2.5 overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="font-mono font-bold text-zinc-100 tabular-nums">
              {formatRussianDayLabel(displayDay)}
            </span>
            <span aria-hidden="true" className="text-zinc-600">
              ·
            </span>
            <span className="text-zinc-400">
              {isScrubActive ? 'Ручной срез' : mode === 'live' ? '● LIVE' : 'Рубеж ЦНС'}
            </span>
          </div>

          {isScrubActive ? (
            <button
              type="button"
              onClick={() => setScrubDay(null)}
              className="font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              К точке ЦНС
            </button>
          ) : (
            <span className="font-mono text-[10px] text-zinc-500 whitespace-nowrap">
              {aspect.invertDeltaGood ? 'Цель: 100%' : 'Стек ×3 + 20к'}
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums whitespace-nowrap">
          <div className="inline-flex items-baseline gap-1.5">
            <span className="text-[11px] text-zinc-400 font-sans">Стек:</span>
            <span
              className="text-base sm:text-xl font-extrabold leading-none"
              style={{ color: aspect.accentHex }}
            >
              {displayValue}%
            </span>
            <span aria-hidden="true" className="text-zinc-600">
              ·
            </span>
            <span className="text-[11px] sm:text-xs text-zinc-400">
              Сухой: <strong className="text-zinc-200">{baselineDisplayValue}%</strong>
            </span>
          </div>

          <span
            className={`text-[11px] sm:text-xs font-bold whitespace-nowrap ${
              advantageMagnitude > 0 ? 'text-emerald-400' : 'text-zinc-400'
            }`}
          >
            {aspect.invertDeltaGood
              ? advantageMagnitude > 0
                ? `−${advantageMagnitude}% нароста`
                : 'Старт 300%'
              : advantageMagnitude > 0
                ? `+${advantageMagnitude}% форы`
                : 'Старт'}
          </span>
        </div>
      </div>

      {/* Clean Unboxed Legend Row + Chart Variant Descriptor */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400 mb-1.5 px-0.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-200">
            <span
              aria-hidden="true"
              className="w-3.5 h-[2.5px] rounded-full inline-block"
              style={{ backgroundColor: aspect.accentHex }}
            />
            <span>Стек ×3 + 20к</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-400">
            <svg width="14" height="4" viewBox="0 0 14 4" aria-hidden="true">
              <line
                x1="0"
                y1="2"
                x2="14"
                y2="2"
                stroke="rgba(255,255,255,0.42)"
                strokeWidth="1.5"
                strokeDasharray="3 2.5"
              />
            </svg>
            <span>Сухой отказ</span>
          </span>
          {aspect.chartVariant === 'diverging-dual-axis' && (
            <span className="inline-flex items-center gap-1.5 text-rose-300/90">
              <span className="w-3 h-[2px] rounded-full bg-rose-400 inline-block" />
              <span>Кортизол ↓</span>
            </span>
          )}
          {aspect.chartVariant === 'stacked-synergy-contribution' && (
            <span className="inline-flex items-center gap-1.5 text-amber-300/90">
              <span className="w-3 h-[2px] rounded-full bg-amber-400 inline-block" />
              <span>Вклад стека</span>
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-zinc-500">
          {aspect.chartTypeBadge}
        </span>
      </div>

      {/* 2) BESPOKE MULTI-VARIANT SVG STAGE (Strict touchAction: 'pan-y') */}
      <div className="relative" style={{ touchAction: 'pan-y' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_GEOM.viewWidth} ${CHART_GEOM.viewHeight}`}
          style={{ touchAction: 'pan-y' }}
          onPointerDown={handleFilteredPointerDown}
          onPointerMove={(e) => handleFilteredPointerMove(e, svgRef.current)}
          onPointerUp={handleFilteredPointerEnd}
          onPointerCancel={handleFilteredPointerEnd}
          className="w-full h-auto block overflow-visible rounded-xl"
        >
          <defs>
            <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={aspect.accentHex} stopOpacity={0.32} />
              <stop offset="72%" stopColor={aspect.accentHex} stopOpacity={0.07} />
              <stop offset="100%" stopColor={aspect.accentHex} stopOpacity={0.01} />
            </linearGradient>

            <linearGradient id={secondaryGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.03} />
            </linearGradient>

            <filter
              id={glowFilterId}
              x="-20%"
              y="-30%"
              width="140%"
              height="160%"
              filterUnits="objectBoundingBox"
            >
              <feGaussianBlur stdDeviation="2.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Subtle Horizontal Grid Hairlines */}
          {[0.25, 0.5, 0.75].map((r) => {
            const gy =
              CHART_GEOM.padTop +
              r * (CHART_GEOM.viewHeight - CHART_GEOM.padTop - CHART_GEOM.padBottom);
            return (
              <line
                key={r}
                x1={CHART_GEOM.padLeft}
                y1={gy}
                x2={CHART_GEOM.viewWidth - CHART_GEOM.padRight}
                y2={gy}
                stroke="rgba(255,255,255,0.045)"
                strokeWidth="1"
              />
            );
          })}

          {/* Bottom X-Axis Hairline */}
          <line
            x1={CHART_GEOM.padLeft}
            y1={bottomAxisY}
            x2={CHART_GEOM.viewWidth - CHART_GEOM.padRight}
            y2={bottomAxisY}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {/* Vertical Milestone Ticks */}
          {CHART_AXIS_TICKS.map((tick) => {
            const tickX = CHART_GEOM.padLeft + tick.norm * usableWidth;
            return (
              <g key={tick.label}>
                <line
                  x1={tickX}
                  y1={bottomAxisY}
                  x2={tickX}
                  y2={bottomAxisY + 4}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                />
                <text
                  x={tickX}
                  y={CHART_GEOM.viewHeight - 4}
                  textAnchor={
                    tick.norm === 0 ? 'start' : tick.norm === 1 ? 'end' : 'middle'
                  }
                  fill="rgba(161,161,170,0.82)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                >
                  {tick.label}
                </text>
              </g>
            );
          })}

          {/* === VARIANT-SPECIFIC VISUAL LAYERS === */}

          {/* 01 & 05: Target / Smoker Ceiling Threshold Line */}
          {thresholdY !== null && aspect.targetThresholdLabel && (
            <g>
              <line
                x1={CHART_GEOM.padLeft}
                y1={thresholdY}
                x2={CHART_GEOM.viewWidth - CHART_GEOM.padRight}
                y2={thresholdY}
                stroke={
                  aspect.chartVariant === 'inverted-downregulation'
                    ? '#10b981'
                    : '#fbbf24'
                }
                strokeOpacity={0.65}
                strokeWidth="1.25"
                strokeDasharray="5 3"
              />
              <text
                x={CHART_GEOM.viewWidth - CHART_GEOM.padRight - 2}
                y={
                  aspect.chartVariant === 'inverted-downregulation'
                    ? thresholdY - 5
                    : thresholdY - 5
                }
                textAnchor="end"
                fill={
                  aspect.chartVariant === 'inverted-downregulation'
                    ? '#6ee7b7'
                    : '#fde68a'
                }
                fontSize="9.5"
                fontFamily="var(--font-mono)"
              >
                {aspect.targetThresholdLabel}
              </text>
            </g>
          )}

          {/* 03: Velocity Shear-Stress Impulse Bars */}
          {aspect.chartVariant === 'velocity-shear-bars' &&
            shearBars.map((bar, idx) => (
              <rect
                key={idx}
                x={bar.x - 3.2}
                y={bar.y}
                width={6.4}
                height={bar.h}
                rx={2}
                fill={aspect.accentHex}
                fillOpacity={0.2}
              />
            ))}

          {/* 06: Stepped Mitochondrial Output Hybrid */}
          {aspect.chartVariant === 'stepped-atp-hybrid' && steppedPaths && (
            <>
              <path
                d={steppedPaths.stepArea}
                fill={`url(#${areaGradId})`}
              />
              <path
                d={steppedPaths.stepStroke}
                fill="none"
                stroke={aspect.accentSecondaryHex}
                strokeOpacity={0.55}
                strokeWidth="1.35"
              />
            </>
          )}

          {/* 07: Stacked Sleep Phases (N3 deep band + REM top band + falling awakenings) */}
          {aspect.chartVariant === 'stacked-sleep-phases' && secondaryPaths && (
            <>
              <path
                d={mainPaths.areaToBottomPath}
                fill={aspect.accentHex}
                fillOpacity={0.14}
              />
              <path
                d={secondaryPaths.areaToBottomPath}
                fill="#7c3aed"
                fillOpacity={0.3}
              />
              <path
                d={secondaryPaths.strokePath}
                fill="none"
                stroke="#c4b5fd"
                strokeOpacity={0.65}
                strokeWidth="1.4"
              />
              {tertiaryPaths && (
                <path
                  d={tertiaryPaths.strokePath}
                  fill="none"
                  stroke="#fb7185"
                  strokeOpacity={0.72}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}
            </>
          )}

          {/* 08: Vascular Corridor Band (Dry Hypotensive Dip vs Tight Protocol Corridor) */}
          {aspect.chartVariant === 'vascular-corridor-band' && (
            <>
              {dryHypotensionBandPath && (
                <path
                  d={dryHypotensionBandPath}
                  fill="rgba(244, 63, 94, 0.12)"
                />
              )}
              {specializedBandPath && (
                <path
                  d={specializedBandPath}
                  fill={aspect.accentHex}
                  fillOpacity={0.26}
                />
              )}
              {secondaryPaths && (
                <path
                  d={secondaryPaths.strokePath}
                  fill="none"
                  stroke={aspect.accentSecondaryHex}
                  strokeOpacity={0.55}
                  strokeWidth="1.2"
                />
              )}
            </>
          )}

          {/* 09: Stacked Synergy Contribution (Base + Stack + 20k Irisin) */}
          {aspect.chartVariant === 'stacked-synergy-contribution' &&
            secondaryPaths &&
            tertiaryPaths && (
              <>
                <path
                  d={mainPaths.areaToBottomPath}
                  fill="#22c55e"
                  fillOpacity={0.24}
                />
                <path
                  d={secondaryPaths.areaToBottomPath}
                  fill={`url(#${secondaryGradId})`}
                />
                <path
                  d={tertiaryPaths.areaToBottomPath}
                  fill="rgba(161, 161, 170, 0.16)"
                />
                <path
                  d={secondaryPaths.strokePath}
                  fill="none"
                  stroke="#fbbf24"
                  strokeOpacity={0.8}
                  strokeWidth="1.5"
                />
              </>
            )}

          {/* Standard & Specialized Band / Area Fill */}
          {(aspect.chartVariant === 'inverted-downregulation' ||
            aspect.chartVariant === 'dual-spline-shield') &&
            specializedBandPath && (
              <path
                d={specializedBandPath}
                fill={aspect.accentHex}
                fillOpacity={0.18}
              />
            )}

          {(aspect.chartVariant === 'velocity-shear-bars' ||
            aspect.chartVariant === 'diverging-dual-axis' ||
            aspect.chartVariant === 'threshold-crossover') && (
            <path d={mainPaths.areaToBottomPath} fill={`url(#${areaGradId})`} />
          )}

          {/* 04: Diverging Cortisol Drop Curve */}
          {aspect.chartVariant === 'diverging-dual-axis' && secondaryPaths && (
            <path
              d={secondaryPaths.strokePath}
              fill="none"
              stroke="#fb7185"
              strokeOpacity={0.82}
              strokeWidth="1.85"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* Ghost Reference Curve ("Обычный сухой отказ") */}
          <path
            d={basePaths.strokePath}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.6"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Primary Active Protocol Curve */}
          <path
            d={mainPaths.strokePath}
            fill="none"
            stroke={aspect.accentHex}
            strokeWidth="2.65"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${glowFilterId})`}
          />

          {/* Active / Scrubbed Vertical Crosshair Guide */}
          <line
            x1={activeCoord.x}
            x2={activeCoord.x}
            y1={CHART_GEOM.padTop - 4}
            y2={bottomAxisY}
            stroke={isScrubActive ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.18)'}
            strokeWidth="1"
          />

          {/* Gap Connector Between Protocol & Dry Quit */}
          {Math.abs(baselineCoord.y - activeCoord.y) > 4 && (
            <line
              x1={activeCoord.x}
              x2={activeCoord.x}
              y1={activeCoord.y}
              y2={baselineCoord.y}
              stroke={aspect.accentSecondaryHex}
              strokeOpacity={0.6}
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}

          {/* Baseline Dot */}
          <circle
            cx={baselineCoord.x}
            cy={baselineCoord.y}
            r="3.2"
            fill="#09090d"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
          />

          {/* Active Protocol Dot + Soft Halo */}
          <circle
            cx={activeCoord.x}
            cy={activeCoord.y}
            r="8"
            fill={aspect.accentHex}
            fillOpacity={0.22}
          />
          <circle
            cx={activeCoord.x}
            cy={activeCoord.y}
            r="4.5"
            fill="#060608"
            stroke={aspect.accentSecondaryHex}
            strokeWidth="2.4"
          />
        </svg>
      </div>

      {/* 3) DEDICATED HORIZONTAL SCRUB RAIL + DISCRETE TAPPABLE MILESTONE NODES */}
      <div className="mt-2 space-y-2" style={{ touchAction: 'pan-y' }}>
        <div
          ref={railRef}
          role="slider"
          tabIndex={0}
          aria-label={`Горизонтальная рельса времени: ${aspect.title}`}
          aria-valuemin={0}
          aria-valuemax={90}
          aria-valuenow={Math.round(displayDay)}
          aria-valuetext={`${formatRussianDayLabel(displayDay)}: Протокол ${displayValue}%, сухой отказ ${baselineDisplayValue}%`}
          style={{ touchAction: 'pan-y' }}
          onKeyDown={handleKeyDown}
          onPointerDown={handleFilteredPointerDown}
          onPointerMove={(e) => handleFilteredPointerMove(e, railRef.current)}
          onPointerUp={handleFilteredPointerEnd}
          onPointerCancel={handleFilteredPointerEnd}
          className="relative h-7 rounded-xl bg-white/[0.035] border border-white/[0.08] px-3 flex items-center cursor-ew-resize focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/60"
        >
          <div className="relative w-full h-1 rounded-full bg-white/[0.1]">
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, activeNormPercent))}%`,
                backgroundColor: aspect.accentHex
              }}
            />
            <span
              aria-hidden="true"
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 bg-[#060608] shadow"
              style={{
                left: `${Math.min(100, Math.max(0, activeNormPercent))}%`,
                borderColor: aspect.accentSecondaryHex
              }}
            />
          </div>
        </div>

        {/* Discrete Milestone Quick-Tap Nodes (Zero Drag Needed!) */}
        <div
          role="group"
          aria-label="Быстрый переход к ключевым дням графика"
          className="grid grid-cols-7 gap-1"
        >
          {CHART_AXIS_TICKS.map((tick) => {
            const isClose = Math.abs(displayDay - tick.day) < 0.35;
            return (
              <button
                key={tick.label}
                type="button"
                onClick={() => setScrubDay(tick.day)}
                className={`min-h-[34px] rounded-lg font-mono text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isClose
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.06]'
                }`}
              >
                {tick.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4) 4 STRUCTURED CLINICAL METRIC BLOCKS + STABLE BIOCHEMICAL INSIGHT */}
      <div className="mt-3 pt-3 border-t border-white/[0.07] space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">База курильщика</p>
            <p className="mt-0.5 font-mono text-xs font-semibold text-zinc-200 tabular-nums">
              {aspect.smokerBaselineLabel}
            </p>
          </div>

          <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">Сейчас (Протокол)</p>
            <p
              className="mt-0.5 font-mono text-xs font-extrabold tabular-nums"
              style={{ color: aspect.accentHex }}
            >
              {displayValue}% · {formatRussianDayLabel(displayDay)}
            </p>
          </div>

          <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">Сухой отказ</p>
            <p className="mt-0.5 font-mono text-xs font-semibold text-zinc-300 tabular-nums">
              {baselineDisplayValue}%{' '}
              {advantageMagnitude > 0
                ? aspect.invertDeltaGood
                  ? `(медленнее на ${advantageMagnitude}%)`
                  : `(отстаёт на ${advantageMagnitude}%)`
                : ''}
            </p>
          </div>

          <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">Ключевой медиатор</p>
            <p className="mt-0.5 text-xs font-semibold text-amber-200/95 leading-snug">
              {aspect.keyMediatorLabel}
            </p>
          </div>
        </div>

        <div className="min-h-[84px] space-y-1">
          <p className="text-xs font-bold text-zinc-100">
            {milestoneNote.stateLabel}
          </p>
          <p className="text-xs leading-relaxed text-zinc-300/95">
            {milestoneNote.biochemicalNote}
          </p>
        </div>
      </div>
    </div>
  );
};
