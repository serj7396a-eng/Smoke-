import React from 'react';
import { motion } from 'motion/react';
import { Activity, Flame, MessageSquareQuote } from 'lucide-react';
import { AppTabId, AuraPhase } from '../types';

interface BottomNavDockProps {
  activeTab: AppTabId;
  auraPhase: AuraPhase;
  onSelectTab: (tab: AppTabId) => void;
}

const DOCK_ACCENT: Record<AuraPhase, string> = {
  acute: '#fb923c',
  peak: '#fbbf24',
  clean: '#34d399'
};

const TABS: {
  id: AppTabId;
  label: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
}[] = [
  { id: 'core', label: 'ЯДРО', icon: Flame },
  { id: 'biochem', label: 'БИОХИМИЯ', icon: Activity },
  { id: 'voices', label: 'ГОЛОСА', icon: MessageSquareQuote }
];

export const BottomNavDock: React.FC<BottomNavDockProps> = ({
  activeTab,
  auraPhase,
  onSelectTab
}) => {
  const accentHex = DOCK_ACCENT[auraPhase];

  return (
    <nav
      aria-label="Основные разделы приложения"
      className="fixed z-40 inset-x-0 flex justify-center pointer-events-none px-4"
      style={{
        bottom: 'max(0.75rem, env(safe-area-inset-bottom, 12px))'
      }}
    >
      <div
        role="tablist"
        className="pointer-events-auto inline-grid grid-cols-3 items-center gap-1 p-1.5 rounded-full bg-[#0b0b11]/90 backdrop-blur-2xl border-t border-white/[0.16] border-x border-b border-white/[0.08] shadow-[0_14px_40px_rgba(0,0,0,0.88)] w-full max-w-[366px]"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComp = tab.icon;

          return (
            <motion.button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectTab(tab.id)}
              className={`relative min-h-[44px] px-3 py-2 rounded-full flex items-center justify-center gap-1.5 text-[11px] font-extrabold tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
                isActive ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="navIndicator"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-zinc-100 shadow-md"
                />
              )}
              <IconComp
                className="relative z-10 w-3.5 h-3.5 shrink-0"
                style={{ color: isActive ? '#09090b' : accentHex }}
              />
              <span className="relative z-10">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
