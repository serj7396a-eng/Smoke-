import React, { useMemo, useRef, useState } from 'react';
import { ASPECTS_DATA } from '../data/aspectsData';
import {
  CIRCADIAN_24H_DATA,
  CIRCADIAN_ANCHOR_HOURS,
  CircadianSlotPoint,
  RADAR_AXES_DATA
} from '../data/circadianRadarData';
import {
  classifyChartGestureIntent,
  formatRussianDayLabel,
  interpolateAspectValue
} from '../utils/recoveryMath';

interface RadarAndCircadianViewProps {
  effectiveDay: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleIndex: number,
  totalAxes: number
): { x: number; y: number } {
  const angleRad = (Math.PI * 2 * angleIndex) / totalAxes - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad)
  };
}

function buildPolygonPoints(
  values: number[],
  cx: number,
  cy: number,
  maxRadius: number
): string {
  return values
    .map((val, idx) => {
      const r = (Math.min(100, Math.max(0, val)) / 100) * maxRadius;
      const pt = polarToCartesian(cx, cy, r, idx, values.length);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');
}

function interpolateCircadianSlot(hour: number): CircadianSlotPoint {
  const clamped = Math.min(23, Math.max(7, hour));
  for (let i = 0; i < CIRCADIAN_24H_DATA.length - 1; i++) {
    const a = CIRCADIAN_24H_DATA[i];
    const b = CIRCADIAN_24H_DATA[i + 1];
    if (clamped >= a.hour && clamped <= b.hour) {
      const ratio = (clamped - a.hour) / Math.max(0.01, b.hour - a.hour);
      const nearest = ratio < 0.5 ? a : b;
      const wholeH = Math.floor(clamped);
      const mins = Math.round((clamped - wholeH) * 60);
      const hh = String(mins === 60 ? wholeH + 1 : wholeH).padStart(2, '0');
      const mm = String(mins === 60 ? 0 : mins).padStart(2, '0');
      return {
        hour: clamped,
        timeLabel: `${hh}:${mm}`,
        cholineAch: Math.round(a.cholineAch + (b.cholineAch - a.cholineAch) * ratio),
        noopeptCpg: Math.round(a.noopeptCpg + (b.noopeptCpg - a.noopeptCpg) * ratio),
        stepsIrisinEnos: Math.round(
          a.stepsIrisinEnos + (b.stepsIrisinEnos - a.stepsIrisinEnos) * ratio
        ),
        adenosineSleepDrive: Math.round(
          a.adenosineSleepDrive + (b.adenosineSleepDrive - a.adenosineSleepDrive) * ratio
        ),
        protocolHeadline: nearest.protocolHeadline,
        protocolNote: nearest.protocolNote
      };
    }
  }
  return CIRCADIAN_24H_DATA[CIRCADIAN_24H_DATA.length - 1];
}

export const RadarAndCircadianView: React.FC<RadarAndCircadianViewProps> = ({
  effectiveDay
}) => {
  const [selectedAxisIdx, setSelectedAxisIdx] = useState<number>(0);
  const [selectedHour, setSelectedHour] = useState<number>(13);

  const circadianSvgRef = useRef<SVGSVGElement | null>(null);
  const circadianRailRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    intent: 'idle' | 'pending' | 'scroll-vertical' | 'scrub-horizontal';
  }>({
    startX: 0,
    startY: 0,
    intent: 'idle'
  });

  // === 1. 6-AXIS RADAR COMPUTATION ===
  const radarMetrics = useMemo(() => {
    return RADAR_AXES_DATA.map((axis) => {
      const aspect =
        ASPECTS_DATA.find((a) => a.id === axis.aspectId) ?? ASPECTS_DATA[1];
      const startVal = interpolateAspectValue(aspect.points, 0, aspect.yDomain);
      const currentVal = interpolateAspectValue(
        aspect.points,
        effectiveDay,
        aspect.yDomain
      );
      const day30Val = interpolateAspectValue(aspect.points, 30, aspect.yDomain);
      return {
        ...axis,
        startVal,
        currentVal,
        day30Val,
        accentHex: aspect.accentHex
      };
    });
  }, [effectiveDay]);

  const radarCx = 170;
  const radarCy = 136;
  const radarMaxR = 88;

  const startPoly = useMemo(
    () =>
      buildPolygonPoints(
        radarMetrics.map((m) => m.startVal),
        radarCx,
        radarCy,
        radarMaxR
      ),
    [radarMetrics]
  );

  const day30Poly = useMemo(
    () =>
      buildPolygonPoints(
        radarMetrics.map((m) => m.day30Val),
        radarCx,
        radarCy,
        radarMaxR
      ),
    [radarMetrics]
  );

  const currentPoly = useMemo(
    () =>
      buildPolygonPoints(
        radarMetrics.map((m) => m.currentVal),
        radarCx,
        radarCy,
        radarMaxR
      ),
    [radarMetrics]
  );

  // === 2. 24-HOUR CIRCADIAN SYNERGY CHART COMPUTATION ===
  const circGeom = {
    w: 360,
    h: 172,
    left: 22,
    right: 22,
    top: 18,
    bottom: 24
  };
  const circUsableW = circGeom.w - circGeom.left - circGeom.right;
  const circUsableH = circGeom.h - circGeom.top - circGeom.bottom;
  const minHour = 7;
  const maxHour = 23;

  const mapHourVal = (hour: number, val: number) => {
    const x =
      circGeom.left + ((hour - minHour) / (maxHour - minHour)) * circUsableW;
    const y = circGeom.top + (1 - val / 100) * circUsableH;
    return { x, y };
  };

  const buildCircadianPolyline = (
    getter: (slot: CircadianSlotPoint) => number
  ): string => {
    const samples = 32;
    let d = '';
    for (let i = 0; i <= samples; i++) {
      const h = minHour + (i / samples) * (maxHour - minHour);
      const slot = interpolateCircadianSlot(h);
      const pt = mapHourVal(h, getter(slot));
      d += i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }
    return d;
  };

  const cholinePath = useMemo(() => buildCircadianPolyline((s) => s.cholineAch), []);
  const noopeptPath = useMemo(() => buildCircadianPolyline((s) => s.noopeptCpg), []);
  const stepsPath = useMemo(() => buildCircadianPolyline((s) => s.stepsIrisinEnos), []);
  const adenosinePath = useMemo(
    () => buildCircadianPolyline((s) => s.adenosineSleepDrive),
    []
  );

  const inspectedSlot = useMemo(
    () => interpolateCircadianSlot(selectedHour),
    [selectedHour]
  );

  const cursorX =
    circGeom.left +
    ((selectedHour - minHour) / (maxHour - minHour)) * circUsableW;

  const cutoff1730X =
    circGeom.left + ((17.5 - minHour) / (maxHour - minHour)) * circUsableW;

  const updateHourFromClientX = (clientX: number, targetEl: Element | null) => {
    const el = targetEl ?? circadianRailRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;

    if (el === circadianSvgRef.current) {
      const svgX = ((clientX - rect.left) / rect.width) * circGeom.w;
      const norm = Math.min(1, Math.max(0, (svgX - circGeom.left) / circUsableW));
      setSelectedHour(minHour + norm * (maxHour - minHour));
    } else {
      const norm = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      setSelectedHour(minHour + norm * (maxHour - minHour));
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement | SVGSVGElement>) => {
    gestureRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      intent: 'pending'
    };
  };

  const onPointerMove = (
    e: React.PointerEvent<HTMLElement | SVGSVGElement>,
    el: Element | null
  ) => {
    const g = gestureRef.current;
    if (g.intent === 'idle' || g.intent === 'scroll-vertical') return;
    if (g.intent === 'pending') {
      const res = classifyChartGestureIntent(
        e.clientX - g.startX,
        e.clientY - g.startY
      );
      if (res === 'pending') return;
      if (res === 'scroll-vertical') {
        g.intent = 'scroll-vertical';
        return;
      }
      g.intent = 'scrub-horizontal';
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture on synthetic events
      }
    }
    if (g.intent === 'scrub-horizontal') {
      updateHourFromClientX(e.clientX, el);
    }
  };

  const onPointerEnd = () => {
    gestureRef.current.intent = 'idle';
  };

  const activeAxis = radarMetrics[selectedAxisIdx] ?? radarMetrics[0];
  const hourNormPct = ((selectedHour - minHour) / (maxHour - minHour)) * 100;

  return (
    <div className="space-y-4" style={{ touchAction: 'pan-y' }}>
      {/* CARD 1: 6-AXIS POLYGON RADAR ("Нейро-профиль восстановления") */}
      <div
        data-testid="neuro-radar-card"
        className="rounded-3xl bg-white/[0.026] border-t border-white/[0.1] border-x border-b border-white/[0.045] p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <div>
            <p className="text-[11px] font-medium text-amber-300">
              6-осевой полигон ЦНС и сосудов
            </p>
            <h2 className="text-base sm:text-xl font-extrabold text-zinc-50 tracking-tight">
              Нейро-профиль восстановления
            </h2>
          </div>
          <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">
            Срез: {formatRussianDayLabel(effectiveDay)}
          </span>
        </div>

        {/* Clean Unboxed Polygon Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 mb-2">
          <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-100">
            <span className="w-3 h-3 rounded-sm bg-amber-400/35 border border-amber-400 inline-block" />
            <span>Текущий срок ({formatRussianDayLabel(effectiveDay)})</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
            <span className="w-3.5 h-[2px] bg-emerald-400 inline-block" />
            <span>День 30 (Эталон)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-400">
            <span className="w-3.5 h-[1.5px] bg-zinc-500 inline-block" />
            <span>Старт курильщика</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-7">
            <svg
              viewBox="0 0 340 272"
              style={{ touchAction: 'pan-y' }}
              className="w-full max-w-[360px] mx-auto h-auto block overflow-visible"
              aria-label="Шестиосевой радар восстановления ЦНС"
            >
              {/* Concentric Hexagonal Web Rings (25%, 50%, 75%, 100%) */}
              {[25, 50, 75, 100].map((lvl) => (
                <polygon
                  key={lvl}
                  points={buildPolygonPoints(
                    [lvl, lvl, lvl, lvl, lvl, lvl],
                    radarCx,
                    radarCy,
                    radarMaxR
                  )}
                  fill="none"
                  stroke={lvl === 100 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'}
                  strokeWidth="1"
                />
              ))}

              {/* Radial Spokes */}
              {radarMetrics.map((m, idx) => {
                const outer = polarToCartesian(
                  radarCx,
                  radarCy,
                  radarMaxR,
                  idx,
                  radarMetrics.length
                );
                const labelPos = polarToCartesian(
                  radarCx,
                  radarCy,
                  radarMaxR + 24,
                  idx,
                  radarMetrics.length
                );
                const isSelected = idx === selectedAxisIdx;
                return (
                  <g key={m.id}>
                    <line
                      x1={radarCx}
                      y1={radarCy}
                      x2={outer.x}
                      y2={outer.y}
                      stroke="rgba(255,255,255,0.09)"
                      strokeWidth="1"
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y + 3}
                      textAnchor="middle"
                      fill={isSelected ? '#fde047' : '#d4d4d8'}
                      fontSize="10.5"
                      fontWeight={isSelected ? '700' : '600'}
                    >
                      {m.shortLabel}
                    </text>
                  </g>
                );
              })}

              {/* Polygon 1: Smoker Baseline (Day 0) */}
              <polygon
                points={startPoly}
                fill="rgba(161, 161, 170, 0.08)"
                stroke="rgba(161, 161, 170, 0.55)"
                strokeWidth="1.4"
                strokeDasharray="3 3"
              />

              {/* Polygon 2: Day 30 Sovereign Benchmark */}
              <polygon
                points={day30Poly}
                fill="rgba(16, 185, 129, 0.06)"
                stroke="#10b981"
                strokeOpacity={0.75}
                strokeWidth="1.5"
              />

              {/* Polygon 3: Current Effective Day */}
              <polygon
                points={currentPoly}
                fill="rgba(245, 158, 11, 0.24)"
                stroke="#fbbf24"
                strokeWidth="2.4"
              />

              {/* Vertex Dots on Current Polygon */}
              {radarMetrics.map((m, idx) => {
                const r = (m.currentVal / 100) * radarMaxR;
                const pt = polarToCartesian(
                  radarCx,
                  radarCy,
                  r,
                  idx,
                  radarMetrics.length
                );
                return (
                  <circle
                    key={m.id}
                    cx={pt.x}
                    cy={pt.y}
                    r={idx === selectedAxisIdx ? 4.8 : 3.4}
                    fill="#060608"
                    stroke="#fde047"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>

          {/* 6 Interactive Axis Telemetry Rows */}
          <div className="md:col-span-5 grid grid-cols-2 md:grid-cols-1 gap-1.5">
            {radarMetrics.map((m, idx) => {
              const active = idx === selectedAxisIdx;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedAxisIdx(idx)}
                  className={`text-left rounded-xl px-3 py-2 transition-colors cursor-pointer border ${
                    active
                      ? 'bg-white/[0.065] border-amber-400/45'
                      : 'bg-white/[0.02] hover:bg-white/[0.045] border-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-zinc-100">
                      {m.shortLabel}
                    </span>
                    <span
                      className="font-mono text-xs font-extrabold tabular-nums"
                      style={{ color: m.accentHex }}
                    >
                      {m.currentVal}%
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-400 tabular-nums">
                    Старт {m.startVal}% → 30д {m.day30Val}%
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-3 pt-2.5 border-t border-white/[0.06] text-xs text-zinc-300 leading-relaxed">
          Выбрана ось <strong className="text-zinc-100">{activeAxis.fullLabel}</strong>: старт курильщика{' '}
          <span className="font-mono text-zinc-200">{activeAxis.startVal}%</span> → сейчас{' '}
          <span className="font-mono text-amber-300 font-bold">{activeAxis.currentVal}%</span> → к 30-му дню{' '}
          <span className="font-mono text-emerald-300 font-bold">{activeAxis.day30Val}%</span>.
        </p>
      </div>

      {/* CARD 2: 24-HOUR CIRCADIAN SYNERGY STACK ("Суточный щит: Стек ×3 + 20к") */}
      <div
        data-testid="circadian-24h-card"
        className="rounded-3xl bg-white/[0.026] border-t border-white/[0.1] border-x border-b border-white/[0.045] p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
          <div>
            <p className="text-[11px] font-medium text-emerald-300">
              Циркадная фармакокинетика и механотрансдукция
            </p>
            <h2 className="text-base sm:text-xl font-extrabold text-zinc-50 tracking-tight">
              Суточный щит: Стек ×3 + 20к шагов
            </h2>
          </div>
          <span className="font-mono text-[11px] text-zinc-400">
            07:00 → 23:00 · Без ям
          </span>
        </div>

        {/* Fixed-Height (h-[68px]) Frosted Circadian Telemetry Bar */}
        <div className="h-[68px] rounded-2xl bg-[#0c0c13]/92 border border-white/[0.09] px-3.5 py-2 flex flex-col justify-between mb-2.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-mono font-bold text-amber-300 tabular-nums">
              {inspectedSlot.timeLabel}
            </span>
            <span className="text-zinc-300 font-semibold text-right">
              {inspectedSlot.protocolHeadline}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px] tabular-nums">
            <span className="text-yellow-300">
              АХ: <strong>{inspectedSlot.cholineAch}%</strong>
            </span>
            <span className="text-sky-300">
              AMPA: <strong>{inspectedSlot.noopeptCpg}%</strong>
            </span>
            <span className="text-emerald-300">
              20к: <strong>{inspectedSlot.stepsIrisinEnos}%</strong>
            </span>
            <span className="text-violet-300">
              Сон: <strong>{inspectedSlot.adenosineSleepDrive}%</strong>
            </span>
          </div>
        </div>

        {/* Unboxed 4-Channel Legend */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-zinc-300 mb-1.5">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-[2.5px] bg-yellow-400 inline-block rounded-full" />
            <span>Холин / АХ</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-[2.5px] bg-sky-400 inline-block rounded-full" />
            <span>Ноопепт (&lt;17:30)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-[2.5px] bg-emerald-400 inline-block rounded-full" />
            <span>20к: eNOS + Иризин</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-[2.5px] bg-violet-400 inline-block rounded-full" />
            <span>Аденозин N3</span>
          </span>
        </div>

        {/* 24-Hour Multi-Spline SVG (touchAction: 'pan-y') */}
        <svg
          ref={circadianSvgRef}
          viewBox={`0 0 ${circGeom.w} ${circGeom.h}`}
          style={{ touchAction: 'pan-y' }}
          onPointerDown={onPointerDown}
          onPointerMove={(e) => onPointerMove(e, circadianSvgRef.current)}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="w-full h-auto block overflow-visible"
          aria-label="Суточный график синергии протокола с 07:00 до 23:00"
        >
          {/* Strict 17:30 Noopept Cutoff Vertical Marker */}
          <line
            x1={cutoff1730X}
            y1={circGeom.top}
            x2={cutoff1730X}
            y2={circGeom.h - circGeom.bottom}
            stroke="rgba(56, 189, 248, 0.4)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text
            x={cutoff1730X - 4}
            y={circGeom.top + 9}
            textAnchor="end"
            fill="#7dd3fc"
            fontSize="9"
            fontFamily="var(--font-mono)"
          >
            Стоп 17:30
          </text>

          {/* Bottom Axis */}
          <line
            x1={circGeom.left}
            y1={circGeom.h - circGeom.bottom}
            x2={circGeom.w - circGeom.right}
            y2={circGeom.h - circGeom.bottom}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {[8, 13, 17, 23].map((hr) => {
            const x =
              circGeom.left + ((hr - minHour) / (maxHour - minHour)) * circUsableW;
            return (
              <text
                key={hr}
                x={x}
                y={circGeom.h - 5}
                textAnchor={hr === 23 ? 'end' : 'middle'}
                fill="rgba(161,161,170,0.85)"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {String(hr).padStart(2, '0')}:00
              </text>
            );
          })}

          {/* 4 Circadian Curves */}
          <path
            d={adenosinePath}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1.9"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
          <path
            d={noopeptPath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.0"
            strokeLinecap="round"
          />
          <path
            d={stepsPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d={cholinePath}
            fill="none"
            stroke="#eab308"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Active Time Crosshair */}
          <line
            x1={cursorX}
            y1={circGeom.top}
            x2={cursorX}
            y2={circGeom.h - circGeom.bottom}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1"
          />
          <circle
            cx={cursorX}
            cy={mapHourVal(selectedHour, inspectedSlot.cholineAch).y}
            r="4"
            fill="#060608"
            stroke="#eab308"
            strokeWidth="2"
          />
          <circle
            cx={cursorX}
            cy={mapHourVal(selectedHour, inspectedSlot.stepsIrisinEnos).y}
            r="4"
            fill="#060608"
            stroke="#10b981"
            strokeWidth="2"
          />
        </svg>

        {/* Horizontal Scrub Rail + 4 Anchor Time Buttons (08:00, 13:00, 17:00, 23:00) */}
        <div className="mt-2 space-y-2" style={{ touchAction: 'pan-y' }}>
          <div
            ref={circadianRailRef}
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onPointerDown}
            onPointerMove={(e) => onPointerMove(e, circadianRailRef.current)}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            className="relative h-7 rounded-xl bg-white/[0.035] border border-white/[0.08] px-3 flex items-center cursor-ew-resize"
          >
            <div className="relative w-full h-1 rounded-full bg-white/[0.1]">
              <div
                className="absolute left-0 top-0 bottom-0 rounded-full bg-amber-400"
                style={{ width: `${Math.min(100, Math.max(0, hourNormPct))}%` }}
              />
              <span
                aria-hidden="true"
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-amber-300 bg-[#060608]"
                style={{ left: `${Math.min(100, Math.max(0, hourNormPct))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {CIRCADIAN_ANCHOR_HOURS.map((hr) => {
              const active = Math.abs(selectedHour - hr) < 0.4;
              const timeStr =
                hr === 8 ? '08:00' : hr === 13 ? '13:00' : hr === 17 ? '17:00' : '23:00';
              const subStr =
                hr === 8 ? 'Старт' : hr === 13 ? 'Обед' : hr === 17 ? 'Финал' : 'Сон N3';
              return (
                <button
                  key={hr}
                  type="button"
                  onClick={() => setSelectedHour(hr)}
                  className={`min-h-[42px] px-1.5 py-1.5 rounded-xl flex flex-col items-center justify-center leading-tight transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-zinc-950 font-bold'
                      : 'bg-white/[0.035] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  <span className="font-mono text-[11px] font-bold tabular-nums">
                    {timeStr}
                  </span>
                  <span
                    className={`text-[10px] mt-0.5 ${
                      active ? 'text-zinc-900 font-semibold' : 'text-zinc-400'
                    }`}
                  >
                    {subStr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-3 pt-2.5 border-t border-white/[0.06] text-xs text-zinc-300 leading-relaxed">
          {inspectedSlot.protocolNote}
        </p>
      </div>
    </div>
  );
};
