import React from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { AuraPhase, ElapsedTimeBreakdown } from '../types';
import { pluralizeRu } from '../utils/recoveryMath';
import { RollingNumber } from './RollingNumber';
import { SilkHorizonCanvas } from './SilkHorizonCanvas';

interface HeroTimerSectionProps {
  breakdown: ElapsedTimeBreakdown;
  quitTimestampMs: number;
  auraPhase: AuraPhase;
  onOpenQuitSheet: () => void;
}

const AURA_TEXT_ACCENTS: Record<
  AuraPhase,
  { accentText: string; phaseBadge: string }
> = {
  acute: {
    accentText: '#fb923c',
    phaseBadge: 'Фаза 01 · Острая детоксикация под щитом (0–72ч)'
  },
  peak: {
    accentText: '#fbbf24',
    phaseBadge: 'Фаза 02 · Снос α4β2 и синергия стека (Дни 3–14)'
  },
  clean: {
    accentText: '#34d399',
    phaseBadge: 'Фаза 03 · Суверенная мощь ЦНС (Дни 15–90+)'
  }
};

export const HeroTimerSection: React.FC<HeroTimerSectionProps> = ({
  breakdown,
  quitTimestampMs,
  auraPhase,
  onOpenQuitSheet
}) => {
  const palette = AURA_TEXT_ACCENTS[auraPhase];

  const formattedQuitDate = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(quitTimestampMs));

  return (
    <section className="relative pt-2.5 pb-8 sm:pt-5 sm:pb-12 overflow-hidden">
      {/* Non-Circular 3D Perspective Topographic Silk Horizon Canvas (pointer-events-none) */}
      <SilkHorizonCanvas
        auraPhase={auraPhase}
        tickSecond={breakdown.totalSeconds}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
        {/* Clean 2-Zone Mobile/Desktop Top Bar */}
        <header className="flex items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-zinc-100 whitespace-nowrap shrink-0">
            НЕЙРОШТИЛЬ
          </span>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onOpenQuitSheet}
            aria-label={`Точка старта: ${formattedQuitDate}. Изменить время старта`}
            className="min-h-[42px] px-3.5 py-1.5 rounded-full bg-white/[0.045] hover:bg-white/[0.09] border-t border-white/[0.12] text-xs font-medium text-zinc-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{formattedQuitDate} · Старт</span>
          </motion.button>
        </header>

        {/* Pitch-Black #060608 Digit Sanctuary + Clean Breathing Silk Horizon Beneath */}
        <div className="pt-6 pb-8 sm:pt-8 sm:pb-10 text-center">
          <p
            className="text-[11px] sm:text-xs font-semibold tracking-wide transition-colors duration-500"
            style={{ color: palette.accentText }}
          >
            {palette.phaseBadge}
          </p>

          <div
            className="mt-3.5 sm:mt-4 flex flex-wrap items-baseline justify-center gap-x-3.5 sm:gap-x-6 gap-y-1"
            aria-label="Живой хронограф времени без никотина"
          >
            <div className="flex items-baseline gap-1.5">
              <RollingNumber
                value={breakdown.days}
                className="text-5xl sm:text-7xl font-bold tracking-tighter text-zinc-50 leading-none"
              />
              <span className="text-xs sm:text-sm font-medium text-zinc-400">
                {pluralizeRu(breakdown.days, ['день', 'дня', 'дней'])}
              </span>
            </div>

            <div className="flex items-baseline gap-2 sm:gap-3.5">
              <div className="flex items-baseline gap-0.5">
                <RollingNumber
                  value={breakdown.formattedTwoDigitHours}
                  className="text-3xl sm:text-5xl font-semibold text-zinc-100 tracking-tight leading-none"
                />
                <span className="text-[11px] sm:text-xs text-zinc-500 ml-0.5">ч</span>
              </div>

              <span className="text-xl sm:text-3xl text-zinc-600 font-light">:</span>

              <div className="flex items-baseline gap-0.5">
                <RollingNumber
                  value={breakdown.formattedTwoDigitMinutes}
                  className="text-3xl sm:text-5xl font-semibold text-zinc-100 tracking-tight leading-none"
                />
                <span className="text-[11px] sm:text-xs text-zinc-500 ml-0.5">м</span>
              </div>

              <span className="text-xl sm:text-3xl text-zinc-600 font-light">:</span>

              <div className="flex items-baseline gap-0.5">
                <RollingNumber
                  value={breakdown.formattedTwoDigitSeconds}
                  className="text-3xl sm:text-5xl font-semibold tracking-tight leading-none"
                  style={{ color: palette.accentText }}
                />
                <span className="text-[11px] sm:text-xs text-zinc-500 ml-0.5">с</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
