import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Brain,
  Flame,
  HeartPulse,
  Layers,
  Moon,
  Shield,
  Sparkles,
  Zap
} from 'lucide-react';
import { ASPECTS_DATA } from '../data/aspectsData';
import {
  AspectIconName,
  BiochemViewMode,
  RecoveryStage
} from '../types';
import { buildMiniSparkline, interpolateAspectValue } from '../utils/recoveryMath';
import { StylizedSplineChart } from './StylizedSplineChart';
import { RadarAndCircadianView } from './RadarAndCircadianView';

interface BiochemistryTabSectionProps {
  effectiveDay: number;
  activeStage: RecoveryStage;
  isLive: boolean;
}

const ICON_MAP: Record<
  AspectIconName,
  React.FC<{ className?: string; style?: React.CSSProperties }>
> = {
  shield: Shield,
  flame: Flame,
  activity: Activity,
  zap: Zap,
  brain: Brain,
  moon: Moon,
  layers: Layers,
  'heart-pulse': HeartPulse,
  sparkles: Sparkles
};

export const BiochemistryTabSection: React.FC<BiochemistryTabSectionProps> = ({
  effectiveDay,
  activeStage,
  isLive
}) => {
  const [viewMode, setViewMode] = useState<BiochemViewMode>('systems');
  const [selectedAspectId, setSelectedAspectId] = useState<string>(
    ASPECTS_DATA[0].id
  );
  const [detailTab, setDetailTab] = useState<'essence' | 'deep'>('essence');

  const activeAspect =
    ASPECTS_DATA.find((a) => a.id === selectedAspectId) ?? ASPECTS_DATA[0];
  const ActiveIcon = ICON_MAP[activeAspect.iconName];

  return (
    <section
      className="max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-6 space-y-3.5"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Compact Header + Top View Switcher */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-base sm:text-xl font-extrabold text-zinc-50 tracking-tight">
            Матрица биохимии · 9 систем ЦНС
          </h1>
          <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
            {activeStage.rangeLabel}
          </span>
        </div>

        {/* Sleek Top View Switcher: "9 Систем ЦНС" vs "Радар и Стек 24ч" */}
        <div
          role="tablist"
          aria-label="Режим аналитики биохимии"
          className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/[0.035] border border-white/[0.07]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'systems'}
            onClick={() => setViewMode('systems')}
            className={`relative min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'systems'
                ? 'text-zinc-950'
                : 'text-zinc-300 hover:text-zinc-50'
            }`}
          >
            {viewMode === 'systems' && (
              <motion.span
                layoutId="biochemTopViewPill"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-zinc-100 shadow-sm"
              />
            )}
            <span className="relative z-10">9 Систем ЦНС</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'radar24h'}
            onClick={() => setViewMode('radar24h')}
            className={`relative min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'radar24h'
                ? 'text-zinc-950'
                : 'text-amber-300 hover:text-amber-200'
            }`}
          >
            {viewMode === 'radar24h' && (
              <motion.span
                layoutId="biochemTopViewPill"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-amber-400 shadow-sm"
              />
            )}
            <span className="relative z-10">Радар и Стек 24ч</span>
          </button>
        </div>
      </div>

      {viewMode === 'radar24h' ? (
        <RadarAndCircadianView effectiveDay={effectiveDay} />
      ) : (
        <>
          {/* 1) Compact 3x3 Bento Selector Grid (All 9 Biomarker Systems, Zero Truncation) */}
          <div
            role="tablist"
            aria-label="Выбор физиологической системы ЦНС"
            className="grid grid-cols-3 gap-1.5 sm:gap-2"
          >
            {ASPECTS_DATA.map((aspect) => {
              const isSelected = aspect.id === activeAspect.id;
              const IconComp = ICON_MAP[aspect.iconName];
              const livePct = interpolateAspectValue(
                aspect.points,
                effectiveDay,
                aspect.yDomain
              );
              const spark = buildMiniSparkline(
                aspect.points,
                effectiveDay,
                64,
                20,
                aspect.yDomain
              );

              return (
                <button
                  key={aspect.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedAspectId(aspect.id)}
                  style={
                    isSelected
                      ? {
                          borderColor: `${aspect.accentHex}99`,
                          boxShadow: `inset 0 1px 0 0 ${aspect.accentHex}44`
                        }
                      : undefined
                  }
                  className={`relative text-left rounded-2xl p-2.5 sm:p-3 transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-white/[0.065]'
                      : 'bg-white/[0.022] hover:bg-white/[0.045] border-white/[0.055]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] font-semibold text-zinc-500">
                      {aspect.order}
                    </span>
                    <IconComp
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: aspect.accentHex }}
                    />
                  </div>

                  <p className="mt-1 text-[11px] sm:text-xs font-bold text-zinc-100 leading-tight">
                    {aspect.shortBentoLabel}
                  </p>

                  <div className="mt-1.5 flex items-end justify-between gap-1">
                    <span
                      className="font-mono text-sm sm:text-base font-extrabold tabular-nums leading-none"
                      style={{
                        color: isSelected ? aspect.accentHex : '#e4e4e7'
                      }}
                    >
                      {livePct}%
                    </span>

                    <svg
                      width="44"
                      height="16"
                      viewBox="0 0 64 20"
                      aria-hidden="true"
                      className="overflow-visible shrink-0 hidden xs:block sm:block"
                    >
                      <path
                        d={spark.strokePath}
                        fill="none"
                        stroke={aspect.accentHex}
                        strokeOpacity={isSelected ? 0.95 : 0.55}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <circle
                        cx={spark.dotX}
                        cy={spark.dotY}
                        r="2.4"
                        fill={aspect.accentSecondaryHex}
                      />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 2) Active System Detail Stage */}
          <div
            className="relative rounded-3xl bg-white/[0.026] border-t border-white/[0.11] border-x border-b border-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-4 sm:p-6 overflow-hidden"
            style={{ touchAction: 'pan-y' }}
          >
            <div
              aria-hidden="true"
              style={{
                background: `radial-gradient(circle at 84% 12%, ${activeAspect.accentGlowRgba} 0%, rgba(6,6,8,0) 62%)`
              }}
              className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-300"
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-medium text-zinc-400">
                  <span className="font-mono text-zinc-500 mr-1.5">
                    {activeAspect.order}.
                  </span>
                  {activeAspect.shortTag}
                </span>
                <ActiveIcon
                  className="w-4 h-4 shrink-0"
                  style={{ color: activeAspect.accentHex }}
                />
              </div>

              <h2
                className="text-base sm:text-xl font-extrabold text-zinc-50 tracking-tight leading-snug mb-3"
                style={{ textWrap: 'balance' }}
              >
                {activeAspect.title}
              </h2>

              <StylizedSplineChart
                aspect={activeAspect}
                effectiveDay={effectiveDay}
                mode={isLive ? 'live' : activeStage.id}
              />

              {/* Essence vs Deep Neurobiology + PubMed Switcher */}
              <div className="mt-4 pt-4 border-t border-white/[0.07]">
                <div
                  role="tablist"
                  aria-label="Глубина описания системы"
                  className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/[0.035] border border-white/[0.06]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={detailTab === 'essence'}
                    onClick={() => setDetailTab('essence')}
                    className={`min-h-[38px] px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      detailTab === 'essence'
                        ? 'bg-zinc-100 text-zinc-950 font-bold'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    Суть синергии
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={detailTab === 'deep'}
                    onClick={() => setDetailTab('deep')}
                    className={`min-h-[38px] px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      detailTab === 'deep'
                        ? 'bg-amber-400 text-zinc-950 font-bold'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    Механизм + PubMed
                  </button>
                </div>

                {detailTab === 'essence' ? (
                  <div className="mt-3.5">
                    <p className="text-sm text-zinc-200 leading-[1.68]">
                      {activeAspect.scientificLead}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3.5 space-y-3">
                    <p className="text-sm text-zinc-200 leading-[1.68] font-medium">
                      {activeAspect.scientificLead}
                    </p>
                    <p className="text-sm text-zinc-300/95 leading-[1.68]">
                      {activeAspect.mechanismDeepDive}
                    </p>
                    <div className="pt-3 border-t border-white/[0.06]">
                      <p className="text-xs text-amber-300/95 leading-relaxed">
                        {activeAspect.clinicalReference}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
