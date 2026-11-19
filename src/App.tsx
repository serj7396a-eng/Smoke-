import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { AppTabId } from './types';
import {
  computeElapsedBreakdown,
  resolveActiveContext
} from './utils/recoveryMath';
import { HeroTimerSection } from './components/HeroTimerSection';
import { CoreBentoSection } from './components/CoreBentoSection';
import { BiochemistryTabSection } from './components/BiochemistryTabSection';
import { VoicesDeckTabSection } from './components/VoicesDeckTabSection';
import { BottomNavDock } from './components/BottomNavDock';
import { QuitTimeSheet } from './components/QuitTimeSheet';
import {
  loadInitialQuitTimestamp,
  saveQuitTimestamp
} from './utils/safeStorage';

const TAB_ORDER: Record<AppTabId, number> = {
  core: 0,
  biochem: 1,
  voices: 2
};

export default function App() {
  const [quitTimestampMs, setQuitTimestampMs] = useState<number>(() =>
    loadInitialQuitTimestamp()
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [isQuitSheetOpen, setIsQuitSheetOpen] = useState<boolean>(false);

  // null = automatic LIVE real-time stage tracking; 0..18 = manual stage inspection
  const [previewStageIndex, setPreviewStageIndex] = useState<number | null>(null);

  // 3-Tab Multi-Layered Navigation State + Directional Choreography
  const [tabState, setTabState] = useState<{ tab: AppTabId; direction: number }>({
    tab: 'core',
    direction: 1
  });

  // Crisp 1-second timer synchronization
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const breakdown = useMemo(
    () => computeElapsedBreakdown(quitTimestampMs, nowMs),
    [quitTimestampMs, nowMs]
  );

  // Reactive single source of truth across all 19 contiguous [minHours, maxHours) stages
  const {
    liveStageIndex,
    activeStageIndex,
    activeStage,
    effectiveDay,
    auraPhase,
    isLive
  } = useMemo(
    () => resolveActiveContext(previewStageIndex, breakdown.elapsedDays),
    [previewStageIndex, breakdown.elapsedDays]
  );

  const handleSelectTab = (nextTab: AppTabId) => {
    if (nextTab === tabState.tab) return;
    const dir = TAB_ORDER[nextTab] > TAB_ORDER[tabState.tab] ? 1 : -1;
    setTabState({ tab: nextTab, direction: dir });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleSaveQuitTimestamp = (newTs: number) => {
    setQuitTimestampMs(newTs);
    setNowMs(Date.now());
    setPreviewStageIndex(null);
    saveQuitTimestamp(newTs);
  };

  return (
    <div className="relative min-h-dvh bg-[#060608] text-[#F4F4F6] overflow-x-hidden pb-32">
      {/* Tactile Editorial SVG Film-Grain Noise Overlay (opacity: 0.025) */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.025]"
      >
        <filter id="oled-editorial-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#oled-editorial-grain)" />
      </svg>

      {/* Clean Secondary Top Ribbon for Tab 2 & Tab 3 (Brand Wordmark + 1-Tap Live Clock) */}
      {tabState.tab !== 'core' && (
        <header className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 pt-2.5 pb-2 border-b border-white/[0.06] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => handleSelectTab('core')}
            className="text-sm font-extrabold tracking-tight text-zinc-100 cursor-pointer whitespace-nowrap shrink-0"
          >
            НЕЙРОШТИЛЬ
          </button>

          <button
            type="button"
            onClick={() => setIsQuitSheetOpen(true)}
            aria-label="Живой отсчёт времени без никотина. Изменить время старта"
            className="min-h-[40px] px-3 py-1.5 rounded-full bg-white/[0.045] hover:bg-white/[0.09] border border-white/[0.09] text-xs font-mono text-zinc-200 tabular-nums inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {breakdown.days}д {breakdown.formattedTwoDigitHours}:
              {breakdown.formattedTwoDigitMinutes}:{breakdown.formattedTwoDigitSeconds}
            </span>
          </button>
        </header>
      )}

      {/* Multi-Layered Tab Stage with Directional Choreography */}
      <main className="relative z-10">
        <motion.div
          key={tabState.tab}
          initial={{
            x: tabState.direction * 28,
            opacity: 0,
            filter: 'blur(4px)'
          }}
          animate={{
            x: 0,
            opacity: 1,
            filter: 'blur(0px)'
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          {tabState.tab === 'core' && (
            <>
              <HeroTimerSection
                breakdown={breakdown}
                quitTimestampMs={quitTimestampMs}
                auraPhase={auraPhase}
                onOpenQuitSheet={() => setIsQuitSheetOpen(true)}
              />

              <CoreBentoSection
                stage={activeStage}
                auraPhase={auraPhase}
                activeStageIndex={activeStageIndex}
                liveStageIndex={liveStageIndex}
                isLive={isLive}
                elapsedHours={breakdown.elapsedHours}
                onSelectStageIndex={setPreviewStageIndex}
                onResetLive={() => setPreviewStageIndex(null)}
              />
            </>
          )}

          {tabState.tab === 'biochem' && (
            <BiochemistryTabSection
              effectiveDay={effectiveDay}
              activeStage={activeStage}
              isLive={isLive}
            />
          )}

          {tabState.tab === 'voices' && (
            <VoicesDeckTabSection
              activeStage={activeStage}
              effectiveDay={effectiveDay}
              activeStageIndex={activeStageIndex}
              liveStageIndex={liveStageIndex}
              isLive={isLive}
              onSelectStageIndex={setPreviewStageIndex}
              onResetLive={() => setPreviewStageIndex(null)}
            />
          )}
        </motion.div>
      </main>

      {/* Sleek 3-Tab Floating Frosted-Glass Bottom Dock */}
      <BottomNavDock
        activeTab={tabState.tab}
        auraPhase={auraPhase}
        onSelectTab={handleSelectTab}
      />

      {/* Minimalist Obsidian-Glass Dialog for Quit Timestamp */}
      <QuitTimeSheet
        isOpen={isQuitSheetOpen}
        currentQuitTimestampMs={quitTimestampMs}
        onClose={() => setIsQuitSheetOpen(false)}
        onSaveQuitTimestamp={handleSaveQuitTimestamp}
      />
    </div>
  );
}
