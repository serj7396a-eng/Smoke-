import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { STAGES_DATA } from '../data/stagesData';

export interface CompactStageSelectorProps {
  activeStageIndex: number;
  liveStageIndex: number;
  isLive: boolean;
  onSelectStageIndex: (index: number) => void;
  onResetLive: () => void;
  locationId?: string;
}

const MILESTONE_TICKS: { label: string; stageIndex: number }[] = [
  { label: '0ч', stageIndex: 0 },
  { label: '4–8ч', stageIndex: 1 },
  { label: '1д', stageIndex: 3 },
  { label: '3д', stageIndex: 5 },
  { label: '6д', stageIndex: 8 },
  { label: '14д', stageIndex: 12 },
  { label: '30д', stageIndex: 16 },
  { label: '90д', stageIndex: 18 }
];

export const CompactStageSelector: React.FC<CompactStageSelectorProps> = ({
  activeStageIndex,
  liveStageIndex,
  isLive,
  onSelectStageIndex,
  onResetLive,
  locationId = 'core'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const totalStages = STAGES_DATA.length; // 19
  const maxIndex = totalStages - 1; // 18
  const safeActiveIdx = Math.min(maxIndex, Math.max(0, activeStageIndex));
  const safeLiveIdx = Math.min(maxIndex, Math.max(0, liveStageIndex));
  const activeStage = STAGES_DATA[safeActiveIdx];

  const progressRatioPct = maxIndex > 0 ? (safeActiveIdx / maxIndex) * 100 : 0;
  const liveMarkerPct = maxIndex > 0 ? (safeLiveIdx / maxIndex) * 100 : 0;

  const handleStep = (delta: number) => {
    const nextIdx = Math.min(maxIndex, Math.max(0, safeActiveIdx + delta));
    onSelectStageIndex(nextIdx);
  };

  return (
    <div
      className="w-full"
      onPointerDown={(e) => {
        // Prevent parent drag-to-close sheets from hijacking slider interaction
        e.stopPropagation();
      }}
    >
      {/* Collapsed Default Micro-Pill Row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={`stage-scrubber-panel-${locationId}`}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`h-8 px-3 rounded-full border text-xs font-semibold inline-flex items-center gap-2 transition active:scale-95 cursor-pointer whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
            isLive
              ? 'bg-amber-500/10 hover:bg-amber-500/16 border-amber-400/30 text-amber-300'
              : 'bg-amber-400/15 hover:bg-amber-400/22 border-amber-400/50 text-amber-200'
          }`}
        >
          <span
            aria-hidden="true"
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isLive
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                : 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.85)]'
            }`}
          />
          <span>
            Окно ЦНС: {activeStage.shortLabel} ({safeActiveIdx + 1}/{totalStages})
          </span>
          <SlidersHorizontal className="w-3 h-3 opacity-80 shrink-0" />
          <ChevronDown
            className={`w-3.5 h-3.5 opacity-75 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {!isLive && (
          <button
            type="button"
            onClick={() => {
              onResetLive();
            }}
            aria-label="Вернуться к текущему живому этапу таймера"
            className="px-2.5 h-8 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold inline-flex items-center gap-1 transition active:scale-95 cursor-pointer whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <span>↺ LIVE</span>
          </button>
        )}
      </div>

      {/* Expanded Inline Obsidian-Glass Scrubber Panel */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`stage-scrubber-panel-${locationId}`}
            key="stage-scrubber-panel"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 p-3.5 rounded-2xl bg-[#111218]/95 backdrop-blur-xl border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3">
              {/* 1) Top Readout Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-amber-300 tabular-nums whitespace-nowrap">
                    {safeActiveIdx + 1} / {totalStages}
                  </span>
                  <span aria-hidden="true" className="text-zinc-600">
                    ·
                  </span>
                  <span className="font-bold text-zinc-100 leading-snug">
                    {activeStage.shortLabel} · {activeStage.tag}
                  </span>
                </div>

                {isLive ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-300 whitespace-nowrap">
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    />
                    <span>Мой рубеж</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onResetLive}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3 shrink-0" />
                    <span>К моему сроку ({STAGES_DATA[safeLiveIdx].shortLabel})</span>
                  </button>
                )}
              </div>

              {/* 2) Tactile Range Slider (0..18) + Crisp ‹ / › Step Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStep(-1)}
                  disabled={safeActiveIdx <= 0}
                  aria-label="Предыдущий этап ЦНС"
                  className="min-w-[36px] min-h-[36px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-35 disabled:pointer-events-none border border-white/[0.09] flex items-center justify-center text-zinc-200 transition active:scale-95 cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="relative flex-1 h-9 flex items-center px-1">
                  {/* Track Background + Golden Fill + Live Position Pin */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-1 h-1.5 rounded-full bg-white/[0.09]"
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                      style={{ width: `${progressRatioPct}%` }}
                    />
                    <span
                      title="Текущий живой этап"
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#111218]"
                      style={{ left: `${liveMarkerPct}%` }}
                    />
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={maxIndex}
                    step={1}
                    value={safeActiveIdx}
                    aria-label="Ползунок выбора этапа восстановления ЦНС (от 1 до 19)"
                    aria-valuetext={`${safeActiveIdx + 1} из ${totalStages}: ${activeStage.shortLabel} · ${activeStage.tag}`}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      onSelectStageIndex(next);
                    }}
                    className="stage-scrubber-range relative z-10 w-full h-9"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleStep(1)}
                  disabled={safeActiveIdx >= maxIndex}
                  aria-label="Следующий этап ЦНС"
                  className="min-w-[36px] min-h-[36px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-35 disabled:pointer-events-none border border-white/[0.09] flex items-center justify-center text-zinc-200 transition active:scale-95 cursor-pointer shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 3) Quick-Tap Milestone Ticks Under the Track */}
              <div
                role="group"
                aria-label="Быстрый выбор ключевых вех ЦНС"
                className="grid grid-cols-8 gap-1"
              >
                {MILESTONE_TICKS.map((tick) => {
                  const isTickActive = safeActiveIdx === tick.stageIndex;
                  const isTickLive = safeLiveIdx === tick.stageIndex;
                  return (
                    <button
                      key={tick.label}
                      type="button"
                      onClick={() => onSelectStageIndex(tick.stageIndex)}
                      className={`min-h-[30px] px-1 rounded-lg font-mono text-[10px] sm:text-[11px] font-semibold transition active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center ${
                        isTickActive
                          ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                          : isTickLive
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/35'
                            : 'bg-white/[0.035] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.06]'
                      }`}
                    >
                      {tick.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
