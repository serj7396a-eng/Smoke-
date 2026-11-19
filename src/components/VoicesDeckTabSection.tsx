import React, { useMemo, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform
} from 'motion/react';
import {
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import { VOICES_DATA } from '../data/voicesData';
import { CommunityVoice, RecoveryStage } from '../types';
import {
  getMatchedVoices,
  isVoiceInStageWindow,
  wrapDeckIndex
} from '../utils/recoveryMath';
import { CompactStageSelector } from './CompactStageSelector';

type VoicesFeedScope = 'matched' | 'protocol' | 'all';

interface VoicesDeckTabSectionProps {
  activeStage: RecoveryStage;
  effectiveDay: number;
  activeStageIndex: number;
  liveStageIndex: number;
  isLive: boolean;
  onSelectStageIndex: (index: number) => void;
  onResetLive: () => void;
}

interface TopDraggableVoiceCardProps {
  voice: CommunityVoice;
  isExactMatch: boolean;
  feedScope: VoicesFeedScope;
  exitDirection: number;
  onSwipeNext: () => void;
  onSwipePrev: () => void;
}

const TopDraggableVoiceCard: React.FC<TopDraggableVoiceCardProps> = ({
  voice,
  isExactMatch,
  feedScope,
  exitDirection,
  onSwipeNext,
  onSwipePrev
}) => {
  const [isNeuroOpen, setIsNeuroOpen] = useState(false);
  const x = useMotionValue(0);
  const rotateZ = useTransform(x, [-190, 0, 190], [-7, 0, 7]);
  const dragScale = useTransform(x, [-190, 0, 190], [0.98, 1, 0.98]);

  return (
    <motion.article
      style={{ x, rotateZ, scale: dragScale, transformOrigin: '50% 85%' }}
      initial={{ scale: 0.95, y: 12, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{
        x: exitDirection * 340,
        rotateZ: exitDirection * 10,
        opacity: 0,
        scale: 0.94,
        transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] }
      }}
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.82}
      onDragEnd={(_, info) => {
        if (info.offset.x < -72 || info.velocity.x < -380) {
          onSwipeNext();
        } else if (info.offset.x > 72 || info.velocity.x > 380) {
          onSwipePrev();
        }
      }}
      className="relative z-30 rounded-3xl bg-[#0e0e14]/96 backdrop-blur-xl border-t border-white/[0.14] border-x border-b border-white/[0.06] p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)] touch-pan-y cursor-grab active:cursor-grabbing select-none"
    >
      {/* Clean Unboxed 2-Row Source & Smoker Metadata */}
      <div className="space-y-1 mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="font-bold text-amber-300">{voice.source}</span>
            <span aria-hidden="true" className="text-zinc-600">
              ·
            </span>
            <span className="font-mono text-zinc-300">{voice.authorHandle}</span>
          </div>

          {voice.isProtocolStory && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
              <Zap className="w-3 h-3 shrink-0" />
              <span>Стек + 20к</span>
            </span>
          )}
        </div>

        <p className="text-[11px] sm:text-xs text-zinc-400 leading-snug">
          {voice.smokerProfile}
          {!isExactMatch && feedScope === 'matched' ? ' · Ближайший рубеж' : ''}
        </p>
      </div>

      {/* Headline */}
      <h2
        className="text-base sm:text-xl font-extrabold text-zinc-50 leading-snug mb-3"
        style={{ textWrap: 'balance' }}
      >
        «{voice.headline}»
      </h2>

      {/* Full Authentic First-Person Quote (Zero Truncation) */}
      <blockquote className="text-sm sm:text-[15px] text-zinc-200 leading-[1.68]">
        {voice.quote}
      </blockquote>

      {/* Interactive Glowing Collapsible Neuroanalysis Drawer Inside Card */}
      <div className="mt-5 pt-4 border-t border-white/[0.08]">
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          aria-expanded={isNeuroOpen}
          onPointerDownCapture={(e) => e.stopPropagation()}
          onClick={() => setIsNeuroOpen((prev) => !prev)}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-amber-400/[0.08] hover:bg-amber-400/[0.13] border border-amber-400/25 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Brain className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-amber-200 leading-snug">
              Нейроанализ симптома: {voice.neuroAnalysisTitle}
            </span>
          </div>
          <motion.span
            animate={{ rotate: isNeuroOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 text-amber-300"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </motion.button>

        <AnimatePresence initial={false}>
          {isNeuroOpen && (
            <motion.div
              key="neuro-drawer"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <p className="pt-3 px-1 text-xs sm:text-sm text-zinc-300 leading-[1.68]">
                {voice.neuroAnalysis}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subtle Swipe Hint Footer */}
      <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Свайп влево / вправо — листать колоду</span>
        <span className="font-mono">Reddit &amp; YouTube</span>
      </div>
    </motion.article>
  );
};

export const VoicesDeckTabSection: React.FC<VoicesDeckTabSectionProps> = ({
  activeStage,
  effectiveDay,
  activeStageIndex,
  liveStageIndex,
  isLive,
  onSelectStageIndex,
  onResetLive
}) => {
  const [feedScope, setFeedScope] = useState<VoicesFeedScope>('matched');
  const [deckState, setDeckState] = useState<{
    contextKey: string;
    rawIndex: number;
  }>({
    contextKey: `${activeStage.id}:matched`,
    rawIndex: 0
  });
  const [exitDirection, setExitDirection] = useState<number>(-1);

  const currentContextKey = `${activeStage.id}:${feedScope}`;
  // Synchronous frame-0 index reset whenever activeStage or feedScope changes (never out of bounds!)
  const safeRawIndex =
    deckState.contextKey === currentContextKey ? deckState.rawIndex : 0;

  const { primary, nearby } = useMemo(
    () => getMatchedVoices(VOICES_DATA, activeStage.id, effectiveDay),
    [activeStage.id, effectiveDay]
  );

  // Sort protocol stories so stories inside the active stage window surface first, then nearest day
  const protocolStories = useMemo(() => {
    const raw = VOICES_DATA.filter((v) => v.isProtocolStory);
    const stageMatched = raw
      .filter((v) => isVoiceInStageWindow(v, activeStage))
      .sort((a, b) => Math.abs(a.day - effectiveDay) - Math.abs(b.day - effectiveDay));
    const rest = raw
      .filter((v) => !isVoiceInStageWindow(v, activeStage))
      .sort((a, b) => Math.abs(a.day - effectiveDay) - Math.abs(b.day - effectiveDay));
    return [...stageMatched, ...rest];
  }, [activeStage, effectiveDay]);

  const matchedPool = useMemo(
    () => [...primary, ...nearby.slice(0, 2)],
    [primary, nearby]
  );

  const deck = useMemo(() => {
    if (feedScope === 'protocol') return protocolStories;
    if (feedScope === 'all') return VOICES_DATA;
    return matchedPool;
  }, [feedScope, protocolStories, matchedPool]);

  const activeIdx = deck.length > 0 ? wrapDeckIndex(safeRawIndex, deck.length) : 0;
  const secondIdx = deck.length > 1 ? wrapDeckIndex(safeRawIndex + 1, deck.length) : 0;
  const thirdIdx = deck.length > 2 ? wrapDeckIndex(safeRawIndex + 2, deck.length) : 0;

  const activeVoice = deck[activeIdx];
  const secondVoice = deck.length > 1 ? deck[secondIdx] : null;
  const thirdVoice = deck.length > 2 ? deck[thirdIdx] : null;

  const handleNext = () => {
    setExitDirection(-1);
    setDeckState({
      contextKey: currentContextKey,
      rawIndex: safeRawIndex + 1
    });
  };

  const handlePrev = () => {
    setExitDirection(1);
    setDeckState({
      contextKey: currentContextKey,
      rawIndex: safeRawIndex - 1
    });
  };

  const handleScopeSwitch = (nextScope: VoicesFeedScope) => {
    setFeedScope(nextScope);
    setDeckState({
      contextKey: `${activeStage.id}:${nextScope}`,
      rawIndex: 0
    });
  };

  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 pt-3 pb-6">
      {/* Compact Header + Counter & Tactile Prev/Next + Synced CompactStageSelector #2 */}
      <div className="space-y-2.5 mb-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base sm:text-xl font-extrabold text-zinc-50 tracking-tight">
            Живые голоса · Колода опыта
          </h1>

          {/* Sleek Counter + Prev/Next Tactile Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={handlePrev}
              aria-label="Предыдущая история"
              className="w-10 h-10 rounded-full bg-white/[0.045] hover:bg-white/[0.1] border border-white/[0.09] flex items-center justify-center text-zinc-200 transition-colors cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>

            <span className="px-1.5 font-mono text-xs font-bold text-zinc-200 tabular-nums whitespace-nowrap">
              {deck.length > 0 ? activeIdx + 1 : 0} / {deck.length}
            </span>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={handleNext}
              aria-label="Следующая история"
              className="w-10 h-10 rounded-full bg-white/[0.045] hover:bg-white/[0.1] border border-white/[0.09] flex items-center justify-center text-zinc-200 transition-colors cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Synced CompactStageSelector #2 directly under header */}
        <CompactStageSelector
          activeStageIndex={activeStageIndex}
          liveStageIndex={liveStageIndex}
          isLive={isLive}
          onSelectStageIndex={onSelectStageIndex}
          onResetLive={onResetLive}
          locationId="voices-tab"
        />

        {/* 3-Chip Filter Bar (Ergonomic Fit on 384px-412px OnePlus 15 with Zero Truncation) */}
        <div
          role="group"
          aria-label="Фильтр колоды отчётов"
          className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-white/[0.035] border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          <button
            type="button"
            onClick={() => handleScopeSwitch('matched')}
            className={`relative min-h-[38px] px-2 py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center ${
              feedScope === 'matched'
                ? 'text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {feedScope === 'matched' && (
              <motion.span
                layoutId="voicesDeckScopePill"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-zinc-100 shadow-sm"
              />
            )}
            <span className="relative z-10 tabular-nums">
              По сроку ({matchedPool.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleScopeSwitch('protocol')}
            className={`relative min-h-[38px] px-2 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
              feedScope === 'protocol'
                ? 'text-zinc-950'
                : 'text-emerald-300 hover:text-emerald-200'
            }`}
          >
            {feedScope === 'protocol' && (
              <motion.span
                layoutId="voicesDeckScopePill"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-emerald-400 shadow-sm"
              />
            )}
            <Zap className="relative z-10 w-3 h-3 shrink-0" />
            <span className="relative z-10 tabular-nums">
              Стек + 20к ({protocolStories.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleScopeSwitch('all')}
            className={`relative min-h-[38px] px-2 py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center ${
              feedScope === 'all'
                ? 'text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {feedScope === 'all' && (
              <motion.span
                layoutId="voicesDeckScopePill"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-amber-400 shadow-sm"
              />
            )}
            <span className="relative z-10 tabular-nums">
              Все ({VOICES_DATA.length})
            </span>
          </button>
        </div>
      </div>

      {/* 3D Stacked Swipe Deck Stage */}
      <div className="relative mb-9">
        {thirdVoice && (
          <motion.div
            key={`bg2-${thirdVoice.id}`}
            aria-hidden="true"
            initial={false}
            animate={{ scale: 0.9, y: 24, opacity: 0.48 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{ transformOrigin: '50% 100%' }}
            className="pointer-events-none absolute inset-0 z-10 rounded-3xl bg-[#13131d] border border-white/[0.11] shadow-lg"
          />
        )}

        {secondVoice && (
          <motion.div
            key={`bg1-${secondVoice.id}`}
            aria-hidden="true"
            initial={false}
            animate={{ scale: 0.95, y: 12, opacity: 0.78 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{ transformOrigin: '50% 100%' }}
            className="pointer-events-none absolute inset-0 z-20 rounded-3xl bg-[#161622] border border-white/[0.14] p-5 overflow-hidden shadow-xl"
          >
            <div className="text-xs text-zinc-500 font-semibold">
              {secondVoice.source} · {secondVoice.smokerProfile}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout" initial={false}>
          {activeVoice && (
            <TopDraggableVoiceCard
              key={`${currentContextKey}-${activeVoice.id}-${safeRawIndex}`}
              voice={activeVoice}
              isExactMatch={isVoiceInStageWindow(activeVoice, activeStage)}
              feedScope={feedScope}
              exitDirection={exitDirection}
              onSwipeNext={handleNext}
              onSwipePrev={handlePrev}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
