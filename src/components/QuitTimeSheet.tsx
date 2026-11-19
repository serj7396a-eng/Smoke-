import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface QuitTimeSheetProps {
  isOpen: boolean;
  currentQuitTimestampMs: number;
  onClose: () => void;
  onSaveQuitTimestamp: (timestampMs: number) => void;
}

function toLocalDateInputValue(ts: number): string {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalTimeInputValue(ts: number): string {
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

export const QuitTimeSheet: React.FC<QuitTimeSheetProps> = ({
  isOpen,
  currentQuitTimestampMs,
  onClose,
  onSaveQuitTimestamp
}) => {
  const [dateStr, setDateStr] = useState(() =>
    toLocalDateInputValue(currentQuitTimestampMs)
  );
  const [timeStr, setTimeStr] = useState(() =>
    toLocalTimeInputValue(currentQuitTimestampMs)
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDateStr(toLocalDateInputValue(currentQuitTimestampMs));
      setTimeStr(toLocalTimeInputValue(currentQuitTimestampMs));
      setErrorMsg(null);
    }
  }, [isOpen, currentQuitTimestampMs]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStr || !timeStr) {
      setErrorMsg('Укажи дату и время.');
      return;
    }
    const parsed = new Date(`${dateStr}T${timeStr}:00`).getTime();
    if (Number.isNaN(parsed)) {
      setErrorMsg('Некорректный формат даты или времени.');
      return;
    }
    if (parsed > Date.now() + 60_000) {
      setErrorMsg('Время старта не может быть в будущем.');
      return;
    }
    setErrorMsg(null);
    onSaveQuitTimestamp(parsed);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quit-sheet-title"
        >
          {/* Frosted Obsidian Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Ultra-Clean Minimalist Obsidian-Glass Dialog */}
          <motion.div
            data-testid="quit-time-modal"
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-[360px] w-full mx-auto rounded-3xl bg-[#0b0b0f]/95 backdrop-blur-2xl border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.85)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="quit-sheet-title"
                className="text-lg font-semibold tracking-tight text-white"
              >
                Время старта
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть окно времени старта"
                className="min-w-[40px] min-h-[40px] -mr-2 -my-1 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-5"
              style={{ colorScheme: 'dark' }}
            >
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="quit-date-input"
                    className="block text-xs font-medium text-zinc-400 mb-1.5"
                  >
                    Дата
                  </label>
                  <input
                    id="quit-date-input"
                    type="date"
                    value={dateStr}
                    style={{ colorScheme: 'dark' }}
                    onChange={(e) => {
                      setDateStr(e.target.value);
                      setErrorMsg(null);
                    }}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.06] focus:border-amber-400/60 border border-white/10 rounded-2xl px-4 py-3.5 text-lg font-semibold tabular-nums text-white outline-none transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="quit-time-input"
                    className="block text-xs font-medium text-zinc-400 mb-1.5"
                  >
                    Время
                  </label>
                  <input
                    id="quit-time-input"
                    type="time"
                    value={timeStr}
                    style={{ colorScheme: 'dark' }}
                    onChange={(e) => {
                      setTimeStr(e.target.value);
                      setErrorMsg(null);
                    }}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.06] focus:border-amber-400/60 border border-white/10 rounded-2xl px-4 py-3.5 text-lg font-semibold tabular-nums text-white outline-none transition"
                  />
                </div>
              </div>

              {errorMsg && (
                <p role="alert" className="mt-3 text-xs text-rose-400 leading-relaxed">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full h-12 mt-5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-base tracking-wide shadow-[0_8px_28px_rgba(245,158,11,0.28)] active:scale-[0.98] transition cursor-pointer"
              >
                ОК
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
