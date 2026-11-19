import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Brain,
  ChevronRight,
  Flame,
  Moon,
  Shield,
  Sparkles,
  Zap
} from 'lucide-react';
import {
  SYNERGY_HERO_METRICS,
  SYNERGY_PILLARS_DATA
} from '../data/synergyProtocolData';
import {
  AuraPhase,
  CoreSheetTopic,
  CoreViewMode,
  RecoveryStage
} from '../types';
import { resolveStageProgressInfo } from '../utils/recoveryMath';
import { CompactStageSelector } from './CompactStageSelector';
import { NeuroDetailSheet } from './NeuroDetailSheet';

interface CoreBentoSectionProps {
  stage: RecoveryStage;
  auraPhase: AuraPhase;
  activeStageIndex: number;
  liveStageIndex: number;
  isLive: boolean;
  elapsedHours: number;
  onSelectStageIndex: (index: number) => void;
  onResetLive: () => void;
}

const PHASE_ACCENT_HEX: Record<AuraPhase, string> = {
  acute: '#fb923c',
  peak: '#fbbf24',
  clean: '#34d399'
};

const PILLAR_ICON_MAP = {
  brain: Brain,
  zap: Zap,
  activity: Activity,
  shield: Shield
} as const;

export const CoreBentoSection: React.FC<CoreBentoSectionProps> = ({
  stage,
  auraPhase,
  activeStageIndex,
  liveStageIndex,
  isLive,
  elapsedHours,
  onSelectStageIndex,
  onResetLive
}) => {
  const [coreMode, setCoreMode] = useState<CoreViewMode>('stage');
  const [openTopic, setOpenTopic] = useState<CoreSheetTopic | null>(null);

  const accentHex = PHASE_ACCENT_HEX[auraPhase];
  const primaryMetric = stage.keyMetrics[0];
  const teasers = stage.bentoTeasers;

  const progressInfo = useMemo(
    () => resolveStageProgressInfo(activeStageIndex, elapsedHours),
    [activeStageIndex, elapsedHours]
  );

  const mechanismTiles: {
    topic: CoreSheetTopic;
    num: string;
    title: string;
    teaser: string;
    icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
    color: string;
  }[] = [
    {
      topic: 'receptors',
      num: '01',
      title: 'Рецепторы α4β2',
      teaser: teasers.receptors,
      icon: Brain,
      color: '#eab308'
    },
    {
      topic: 'dopamine',
      num: '02',
      title: 'Тракт VTA и ГГН',
      teaser: teasers.dopamine,
      icon: Flame,
      color: '#fb923c'
    },
    {
      topic: 'vascular',
      num: '03',
      title: 'Оксид азота eNOS',
      teaser: teasers.vascular,
      icon: Activity,
      color: '#f43f5e'
    },
    {
      topic: 'sleep',
      num: '04',
      title: 'Сон N3 и когниции',
      teaser: teasers.sleep,
      icon: Moon,
      color: '#a78bfa'
    }
  ];

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-4 space-y-3">
      {/* Sleek 2-Pill Spring Segmented Control */}
      <div
        role="tablist"
        aria-label="Режим обзора ядра ЦНС"
        className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/[0.035] border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={coreMode === 'stage'}
          onClick={() => setCoreMode('stage')}
          className={`relative min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            coreMode === 'stage'
              ? 'text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          {coreMode === 'stage' && (
            <motion.span
              layoutId="coreModeSwitch"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="absolute inset-0 rounded-xl bg-zinc-100 shadow-sm"
            />
          )}
          <span className="relative z-10">Фаза ЦНС</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={coreMode === 'protocol'}
          onClick={() => setCoreMode('protocol')}
          className={`relative min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            coreMode === 'protocol'
              ? 'text-zinc-950'
              : 'text-zinc-300 hover:text-zinc-50'
          }`}
        >
          {coreMode === 'protocol' && (
            <motion.span
              layoutId="coreModeSwitch"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="absolute inset-0 rounded-xl bg-amber-400 shadow-sm"
            />
          )}
          <span className="relative z-10">Протокол: Стек ×3 + 20к</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {coreMode === 'stage' ? (
          <motion.div
            key="stage-core-container"
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            {/* 1) Crisp Hero Stage Summary Card + Synced CompactStageSelector #1 + Live Stage Progress Micro-Bar */}
            <div className="rounded-3xl bg-white/[0.028] border-t border-white/[0.12] border-x border-b border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-4 sm:p-6">
              <div className="mb-3">
                <CompactStageSelector
                  activeStageIndex={activeStageIndex}
                  liveStageIndex={liveStageIndex}
                  isLive={isLive}
                  onSelectStageIndex={onSelectStageIndex}
                  onResetLive={onResetLive}
                  locationId="core-card"
                />
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => setOpenTopic('summary')}
                className="w-full text-left group cursor-pointer"
              >
                <h1
                  className="text-lg sm:text-2xl font-extrabold text-zinc-50 tracking-tight leading-snug"
                  style={{ textWrap: 'balance' }}
                >
                  {stage.title}
                </h1>

                <p className="mt-2 text-xs sm:text-sm text-zinc-300/95 leading-relaxed">
                  {stage.leadSummary}
                </p>

                {/* Real-Time Stage Completion Micro-Bar */}
                <div className="mt-3.5 pt-3 border-t border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-zinc-300">
                    <span>{progressInfo.statusText}</span>
                    <span
                      className="font-bold shrink-0"
                      style={{ color: accentHex }}
                    >
                      {progressInfo.progressPct}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progressInfo.progressPct}%`,
                        backgroundColor: accentHex
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                  {primaryMetric && (
                    <div className="inline-flex items-center gap-2 text-xs">
                      <span
                        className="font-mono text-xs sm:text-sm font-bold tabular-nums"
                        style={{ color: accentHex }}
                      >
                        {primaryMetric.value}
                      </span>
                      <span aria-hidden="true" className="text-zinc-600">
                        ·
                      </span>
                      <span className="text-zinc-200 font-medium">
                        {primaryMetric.label}
                      </span>
                    </div>
                  )}

                  <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-100 inline-flex items-center gap-1 transition-colors">
                    <span>Ощущения и маркеры</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.button>
            </div>

            {/* 2) Compact 2x2 Interactive Bento Grid for 4 Neuro-Mechanisms */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {mechanismTiles.map((tile) => {
                const IconComp = tile.icon;
                return (
                  <motion.button
                    key={tile.topic}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setOpenTopic(tile.topic)}
                    className="text-left rounded-3xl bg-white/[0.026] hover:bg-white/[0.052] border-t border-white/[0.1] border-x border-b border-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-3.5 sm:p-4 flex flex-col justify-between transition-colors cursor-pointer min-h-[112px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-zinc-500">
                        {tile.num}
                      </span>
                      <span
                        className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/[0.04]"
                        style={{
                          boxShadow: `0 0 16px ${tile.color}26`
                        }}
                      >
                        <IconComp
                          className="w-3.5 h-3.5"
                          style={{ color: tile.color }}
                        />
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <h2 className="text-xs sm:text-sm font-bold text-zinc-100 leading-tight">
                        {tile.num}. {tile.title}
                      </h2>
                      <p className="mt-1 text-[11px] sm:text-xs text-zinc-400 leading-snug">
                        {tile.teaser}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* 3) Sleek Interactive 15-Year Myth Banner Card */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setOpenTopic('myth')}
              className="w-full text-left rounded-3xl bg-gradient-to-r from-amber-500/[0.09] via-white/[0.025] to-white/[0.02] hover:from-amber-500/[0.14] border-t border-amber-400/25 border-x border-b border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-4 sm:p-5 flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>PubMed · Потолок насыщения α4β2</span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-100 leading-snug">
                  Миф о стаже: почему 15 лет ≠ 3 месяца тумана
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Лишние рецепторы сносятся за 21 день независимо от стажа, а твой стек выводит на сверхфокус к 12–15 суткам. Открыть →
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400 shrink-0" />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="protocol-synergy-view"
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            {/* Compact Zero-Clutter Synergy Hero Banner */}
            <div className="rounded-3xl bg-gradient-to-br from-amber-500/[0.08] via-white/[0.028] to-emerald-500/[0.05] border-t border-amber-400/25 border-x border-b border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-4 sm:p-6 space-y-3">
              <div className="text-[11px] font-semibold text-amber-300 tracking-wide">
                {SYNERGY_HERO_METRICS.kicker}
              </div>

              <h1
                className="text-base sm:text-xl font-extrabold text-zinc-50 tracking-tight leading-snug"
                style={{ textWrap: 'balance' }}
              >
                {SYNERGY_HERO_METRICS.title}
              </h1>

              <p className="text-xs sm:text-sm text-zinc-300/95 leading-relaxed">
                {SYNERGY_HERO_METRICS.lead}
              </p>

              {/* Key Timeline Acceleration Metrics */}
              <div className="pt-3 border-t border-white/[0.08] grid grid-cols-3 gap-2">
                {SYNERGY_HERO_METRICS.accelerationBadges.map((item) => (
                  <div key={item.label} className="space-y-0.5">
                    <p className="font-mono text-xs sm:text-sm font-extrabold text-amber-300 tabular-nums">
                      {item.value}
                    </p>
                    <p className="text-[11px] text-zinc-300 leading-snug">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2x2 Interactive Bento Grid of the 4 Synergy Pillars */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {SYNERGY_PILLARS_DATA.map((pillar) => {
                const IconComp = PILLAR_ICON_MAP[pillar.iconName];
                return (
                  <motion.button
                    key={pillar.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setOpenTopic(pillar.id)}
                    className="text-left rounded-3xl bg-white/[0.026] hover:bg-white/[0.052] border-t border-white/[0.1] border-x border-b border-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-3.5 sm:p-4 flex flex-col justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-zinc-400">
                        {pillar.num}
                      </span>
                      <span
                        className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/[0.045]"
                        style={{
                          boxShadow: `0 0 16px ${pillar.accentHex}28`
                        }}
                      >
                        <IconComp
                          className="w-3.5 h-3.5"
                          style={{ color: pillar.accentHex }}
                        />
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      <h2 className="text-xs sm:text-sm font-extrabold text-zinc-50 leading-tight">
                        {pillar.num}. {pillar.bentoTitle}
                      </h2>
                      <p className="text-[11px] sm:text-xs text-zinc-300/90 leading-snug">
                        {pillar.bentoTeaser}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-100 transition-colors">
                      <span style={{ color: pillar.accentHex }}>
                        Разбор
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Height Swipeable Frosted Glass Bottom Sheet Portal (z-[120]) */}
      <NeuroDetailSheet
        topic={openTopic}
        stage={stage}
        auraPhase={auraPhase}
        activeStageIndex={activeStageIndex}
        liveStageIndex={liveStageIndex}
        isLive={isLive}
        onSelectStageIndex={onSelectStageIndex}
        onResetLive={onResetLive}
        onSelectTopic={setOpenTopic}
        onClose={() => setOpenTopic(null)}
      />
    </section>
  );
};
