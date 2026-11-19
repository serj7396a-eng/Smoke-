import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Moon,
  Shield,
  ShieldAlert,
  Sparkles,
  X,
  Zap
} from 'lucide-react';
import { SATURATION_CEILING_MANIFESTO } from '../data/stagesData';
import { SYNERGY_PILLARS_DATA } from '../data/synergyProtocolData';
import {
  AuraPhase,
  CoreSheetTopic,
  RecoveryStage,
  SynergyPillarId
} from '../types';
import { CompactStageSelector } from './CompactStageSelector';

interface NeuroDetailSheetProps {
  topic: CoreSheetTopic | null;
  stage: RecoveryStage;
  auraPhase: AuraPhase;
  activeStageIndex: number;
  liveStageIndex: number;
  isLive: boolean;
  onSelectStageIndex: (index: number) => void;
  onResetLive: () => void;
  onSelectTopic: (topic: CoreSheetTopic) => void;
  onClose: () => void;
}

const PHASE_ACCENT: Record<AuraPhase, string> = {
  acute: '#fb923c',
  peak: '#fbbf24',
  clean: '#34d399'
};

const STAGE_TOPIC_TABS: { id: CoreSheetTopic; label: string }[] = [
  { id: 'summary', label: 'Сводка и тело' },
  { id: 'receptors', label: '01 · α4β2' },
  { id: 'dopamine', label: '02 · VTA и ГГН' },
  { id: 'vascular', label: '03 · eNOS и АТФ' },
  { id: 'sleep', label: '04 · Сон N3' },
  { id: 'myth', label: 'Миф 15 лет' }
];

const SYNERGY_TOPIC_IDS: SynergyPillarId[] = [
  'pillar-choline',
  'pillar-noopept',
  'pillar-steps',
  'pillar-insulin'
];

const PILLAR_ICON_MAP = {
  brain: Brain,
  zap: Zap,
  activity: Activity,
  shield: Shield
} as const;

function isSynergyTopic(t: CoreSheetTopic | null): t is SynergyPillarId {
  return t !== null && SYNERGY_TOPIC_IDS.includes(t as SynergyPillarId);
}

export const NeuroDetailSheet: React.FC<NeuroDetailSheetProps> = ({
  topic,
  stage,
  auraPhase,
  activeStageIndex,
  liveStageIndex,
  isLive,
  onSelectStageIndex,
  onResetLive,
  onSelectTopic,
  onClose
}) => {
  const accentHex = PHASE_ACCENT[auraPhase];
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const tabStripRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const inSynergyMode = isSynergyTopic(topic);
  const activePillar = inSynergyMode
    ? SYNERGY_PILLARS_DATA.find((p) => p.id === topic) ?? SYNERGY_PILLARS_DATA[0]
    : null;

  const activeSequence: CoreSheetTopic[] = useMemo(
    () =>
      inSynergyMode
        ? SYNERGY_TOPIC_IDS
        : STAGE_TOPIC_TABS.map((t) => t.id),
    [inSynergyMode]
  );

  const currentSeqIdx = topic ? activeSequence.indexOf(topic) : 0;

  // Deterministic horizontal centering of active sub-tab pill inside tabStripRef
  useEffect(() => {
    if (!topic) return;
    const raf = window.requestAnimationFrame(() => {
      const strip = tabStripRef.current;
      const activeBtn = tabButtonRefs.current[topic];
      if (strip && activeBtn) {
        const targetLeft = Math.max(
          0,
          activeBtn.offsetLeft - strip.clientWidth / 2 + activeBtn.offsetWidth / 2
        );
        strip.scrollLeft = targetLeft;
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [topic, inSynergyMode]);

  const goAdjacent = useCallback(
    (delta: number) => {
      if (!topic || activeSequence.length === 0) return;
      const len = activeSequence.length;
      const nextIdx = (((currentSeqIdx + delta) % len) + len) % len;
      onSelectTopic(activeSequence[nextIdx]);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [topic, activeSequence, currentSeqIdx, onSelectTopic]
  );

  useEffect(() => {
    if (!topic) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        goAdjacent(1);
      } else if (e.key === 'ArrowLeft') {
        goAdjacent(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [topic, onClose, goAdjacent]);

  const handleBodyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleBodyPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeStartRef.current) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = e.clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    if (Math.abs(dx) > 54 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      if (dx < 0) {
        goAdjacent(1);
      } else {
        goAdjacent(-1);
      }
    }
  };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {topic && (
        <div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="neuro-sheet-heading"
        >
          {/* Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Full-Height Drag-to-Close & Horizontally Swipeable Frosted Glass Drawer */}
          <motion.div
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 95 || info.velocity.y > 420) {
                onClose();
              }
            }}
            className="relative z-10 w-full sm:max-w-xl max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#0b0b10]/96 backdrop-blur-2xl border-t border-white/[0.16] sm:border sm:border-white/[0.1] shadow-[0_24px_64px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.09)] overflow-hidden"
            style={{
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 16px))'
            }}
          >
            {/* Drag Handle */}
            <div className="pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-11 h-1.5 rounded-full bg-zinc-600/80 mx-auto" />
            </div>

            {/* Sheet Header + CompactStageSelector #3 (for Stage Topics) + Quick Topic Switcher */}
            <div className="px-5 pb-3 border-b border-white/[0.07] shrink-0">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex-1 min-w-0 pt-0.5">
                  {activePillar ? (
                    <span
                      className="text-xs font-semibold tracking-wide block py-1"
                      style={{ color: activePillar.accentHex }}
                    >
                      {activePillar.sheetKicker}
                    </span>
                  ) : (
                    <CompactStageSelector
                      activeStageIndex={activeStageIndex}
                      liveStageIndex={liveStageIndex}
                      isLive={isLive}
                      onSelectStageIndex={onSelectStageIndex}
                      onResetLive={onResetLive}
                      locationId="neuro-sheet"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Закрыть разбор"
                  className="min-w-[40px] min-h-[40px] -mr-2 -mt-0.5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.07] transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal Auto-Centering Pill Bar (01-04 Synergy Pillars OR Stage Topics) */}
              <div
                ref={tabStripRef}
                className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth"
              >
                {inSynergyMode
                  ? SYNERGY_PILLARS_DATA.map((p) => {
                      const active = topic === p.id;
                      return (
                        <button
                          key={p.id}
                          ref={(el) => {
                            tabButtonRefs.current[p.id] = el;
                          }}
                          type="button"
                          onClick={() => onSelectTopic(p.id)}
                          className={`relative min-h-[34px] px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                            active
                              ? 'text-zinc-950 font-semibold'
                              : 'text-zinc-400 bg-white/[0.04] hover:text-zinc-100'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="sheetSynergyTopicIndicator"
                              transition={{
                                type: 'spring',
                                stiffness: 380,
                                damping: 30
                              }}
                              className="absolute inset-0 rounded-full"
                              style={{ backgroundColor: p.accentHex }}
                            />
                          )}
                          <span className="relative z-10">
                            {p.shortPillLabel}
                          </span>
                        </button>
                      );
                    })
                  : STAGE_TOPIC_TABS.map((tab) => {
                      const active = topic === tab.id;
                      return (
                        <button
                          key={tab.id}
                          ref={(el) => {
                            tabButtonRefs.current[tab.id] = el;
                          }}
                          type="button"
                          onClick={() => onSelectTopic(tab.id)}
                          className={`relative min-h-[34px] px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                            active
                              ? 'text-zinc-950 font-semibold'
                              : 'text-zinc-400 bg-white/[0.04] hover:text-zinc-100'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="sheetTopicIndicator"
                              transition={{
                                type: 'spring',
                                stiffness: 380,
                                damping: 30
                              }}
                              className="absolute inset-0 rounded-full bg-amber-400"
                            />
                          )}
                          <span className="relative z-10">{tab.label}</span>
                        </button>
                      );
                    })}
              </div>
            </div>

            {/* Scrollable Unabridged Scientific Content + Subtle Bottom Fade Mask (Zero Text Clipping!) */}
            <div className="relative flex-1 min-h-0 flex flex-col">
              <div
                ref={scrollContainerRef}
                onPointerDown={handleBodyPointerDown}
                onPointerUp={handleBodyPointerUp}
                className="px-5 pt-4 pb-10 overflow-y-auto overscroll-contain space-y-5 flex-1 touch-pan-y"
              >
                <AnimatePresence initial={false}>
                  {activePillar && (
                    <motion.div
                      key={`pillar-${activePillar.id}`}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4"
                    >
                      {(() => {
                        const PillarIcon = PILLAR_ICON_MAP[activePillar.iconName];
                        return (
                          <div
                            className="flex items-center gap-2"
                            style={{ color: activePillar.accentHex }}
                          >
                            <PillarIcon className="w-4 h-4 shrink-0" />
                            <span className="text-xs font-bold">
                              Синергия стека ×3 + 20 000 шагов · Столп{' '}
                              {activePillar.num} из 04
                            </span>
                          </div>
                        );
                      })()}

                      <h2
                        id="neuro-sheet-heading"
                        className="text-xl sm:text-2xl font-extrabold text-zinc-50 leading-snug"
                      >
                        {activePillar.sheetTitle}
                      </h2>

                      <div className="py-2.5 px-3.5 rounded-2xl bg-white/[0.035] border border-white/[0.08]">
                        <p className="text-xs sm:text-sm font-semibold text-zinc-100 leading-relaxed">
                          {activePillar.regimenFormula}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-zinc-300 tracking-wide">
                          Биохимический механизм действия
                        </h3>
                        <p className="text-sm sm:text-[15px] text-zinc-200 leading-[1.7]">
                          {activePillar.biochemicalMechanism}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/[0.08] space-y-2">
                        <h3 className="text-xs font-bold text-zinc-300 tracking-wide">
                          Взаимное усиление с остальным протоколом
                        </h3>
                        <p className="text-sm sm:text-[15px] text-zinc-200 leading-[1.7]">
                          {activePillar.neuroVascularSynergy}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
                        <h3 className="text-xs font-bold text-zinc-300 tracking-wide">
                          Практические физиологические маркеры
                        </h3>
                        <ul className="space-y-2">
                          {activePillar.physiologicalMarkers.map((marker, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2.5 text-sm text-zinc-200 leading-relaxed"
                            >
                              <CheckCircle2
                                className="w-4 h-4 shrink-0 mt-0.5"
                                style={{ color: activePillar.accentHex }}
                              />
                              <span>{marker}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-3 border-t border-white/[0.08]">
                        <p className="text-xs text-amber-300/95 leading-relaxed">
                          Доказательная база: {activePillar.peerReviewedCitations}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {!activePillar && topic === 'summary' && (
                    <motion.div
                      key={`sheet-summary-${stage.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 text-amber-300">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-semibold">
                          Полная клиническая сводка этапа (Протокол Стек ×3 + 20к)
                        </span>
                      </div>
                      <h2
                        id="neuro-sheet-heading"
                        className="text-xl sm:text-2xl font-extrabold text-zinc-50 leading-snug"
                      >
                        {stage.title}
                      </h2>
                      <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                        {stage.subtitle}
                      </p>
                      <p className="text-sm text-zinc-300/95 leading-[1.68]">
                        {stage.leadSummary}
                      </p>

                      <div className="pt-4 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {stage.keyMetrics.map((m) => (
                          <div key={m.label} className="space-y-0.5">
                            <p className="text-xs text-zinc-400">{m.label}</p>
                            <p
                              className="font-mono text-lg font-bold tabular-nums"
                              style={{ color: accentHex }}
                            >
                              {m.value}
                            </p>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                              {m.detail}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-white/[0.08] space-y-2">
                        <h3 className="text-sm font-bold text-zinc-100">
                          Соматические ощущения в теле и психике
                        </h3>
                        <p className="text-sm text-zinc-200 leading-[1.68]">
                          {stage.visceralReality}
                        </p>
                        <p className="text-xs text-amber-300/95 leading-relaxed pt-1">
                          Закон потолка рецепторов: {stage.saturationTruthNote}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {!activePillar && topic === 'receptors' && (
                    <motion.div
                      key={`sheet-receptors-${stage.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 text-amber-400">
                        <Brain className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-semibold">
                          Механизм 01 · Холинергическая кора + Стек ×3
                        </span>
                      </div>
                      <h2
                        id="neuro-sheet-heading"
                        className="text-xl font-extrabold text-zinc-50 leading-snug"
                      >
                        01. Рецепторы α4β2, Церитон за 20 мин до еды и Ноопепт после еды
                      </h2>
                      <p className="text-sm sm:text-base text-zinc-200 leading-[1.7]">
                        {stage.receptorState}
                      </p>
                      <div className="pt-4 border-t border-white/[0.08] space-y-2">
                        <h3 className="text-xs font-bold text-zinc-300">
                          Как это проявляется физически сейчас
                        </h3>
                        <p className="text-sm text-zinc-300/90 leading-[1.65]">
                          {stage.visceralReality}
                        </p>
                        <p className="text-xs text-amber-300/95 leading-relaxed pt-1">
                          {stage.saturationTruthNote}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {!activePillar && topic === 'dopamine' && (
                    <motion.div
                      key={`sheet-dopamine-${stage.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 text-orange-400">
                        <Flame className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-semibold">
                          Механизм 02 · Дофамин VTA, Ацетил-КоА и 20к шагов
                        </span>
                      </div>
                      <h2
                        id="neuro-sheet-heading"
                        className="text-xl font-extrabold text-zinc-50 leading-snug"
                      >
                        02. Тракт VTA–прилежащее ядро и ось стресса ГГН
                      </h2>
                      <p className="text-sm sm:text-base text-zinc-200 leading-[1.7]">
                        {stage.dopamineAndHpa}
                      </p>
                      <div className="pt-4 border-t border-white/[0.08] space-y-2">
                        <h3 className="text-xs font-bold text-zinc-300">
                          Ощущения в теле и эмоциональный фон
                        </h3>
                        <p className="text-sm text-zinc-300/90 leading-[1.65]">
                          {stage.visceralReality}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {!activePillar && topic === 'vascular' && (
                    <motion.div
                      key={`sheet-vascular-${stage.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 text-rose-400">
                        <Activity className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-semibold">
                          Механизм 03 · Сдвиг eNOS от 20к шагов, HIF-1 и АТФ
                        </span>
                      </div>
                      <h2
                        id="neuro-sheet-heading"
                        className="text-xl font-extrabold text-zinc-50 leading-snug"
                      >
                        03. Эндотелиальная NO-синтаза (eNOS), икроножная помпа и АТФ
                      </h2>
                      <p className="text-sm sm:text-base text-zinc-200 leading-[1.7]">
                        {stage.vascularAndCellular}
                      </p>
                      <div className="pt-4 border-t border-white/[0.08] space-y-2">
                        <h3 className="text-xs font-bold text-zinc-300">
                          Отклик тела на текущем этапе
                        </h3>
                        <p className="text-sm text-zinc-300/90 leading-[1.65]">
                          {stage.visceralReality}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {!activePillar && topic === 'sleep' && (
                    <motion.div
                      key={`sheet-sleep-${stage.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 text-violet-400">
                        <Moon className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-semibold">
                          Механизм 04 · Вечерний аденозин 20к и дельта-сон N3
                        </span>
                      </div>
                      <h2
                        id="neuro-sheet-heading"
                        className="text-xl font-extrabold text-zinc-50 leading-snug"
                      >
                        04. Архитектура сна N3, BDNF и когнитивная скорость
                      </h2>
                      <p className="text-sm sm:text-base text-zinc-200 leading-[1.7]">
                        {stage.sleepAndCognition}
                      </p>
                      <div className="pt-4 border-t border-white/[0.08] space-y-2">
                        <h3 className="text-xs font-bold text-zinc-300">
                          Субъективное восприятие и фокус
                        </h3>
                        <p className="text-sm text-zinc-300/90 leading-[1.65]">
                          {stage.visceralReality}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {!activePillar && topic === 'myth' && (
                    <motion.div
                      key={`sheet-myth-${stage.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 text-amber-400">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-semibold">
                          {SATURATION_CEILING_MANIFESTO.kicker}
                        </span>
                      </div>
                      <h2
                        id="neuro-sheet-heading"
                        className="text-xl sm:text-2xl font-extrabold text-zinc-50 leading-snug"
                      >
                        {SATURATION_CEILING_MANIFESTO.title}
                      </h2>
                      <div className="space-y-3.5 text-sm sm:text-base text-zinc-200 leading-[1.68]">
                        {SATURATION_CEILING_MANIFESTO.paragraphs.map((p, idx) => (
                          <p key={idx}>{p}</p>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-white/[0.08]">
                        <p className="text-xs text-amber-300 leading-relaxed">
                          Применительно к этапу ({stage.rangeLabel}):{' '}
                          {stage.saturationTruthNote}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Subtle Bottom Gradient Mask Above Sticky Footer */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#0b0b10] to-transparent z-10"
              />
            </div>

            {/* Tactile Horizontal Swipe & Tap Navigation Footer */}
            <div className="px-5 pt-2.5 border-t border-white/[0.07] flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => goAdjacent(-1)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-zinc-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span>Назад</span>
              </button>

              <span className="text-[11px] text-zinc-500 text-center">
                {inSynergyMode
                  ? `Свайп влево/вправо · 0${currentSeqIdx + 1} / 04`
                  : `Свайп влево/вправо · ${currentSeqIdx + 1} / ${activeSequence.length}`}
              </span>

              <button
                type="button"
                onClick={() => goAdjacent(1)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-zinc-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Далее</span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
