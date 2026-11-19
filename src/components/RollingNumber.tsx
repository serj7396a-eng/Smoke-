import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface RollingNumberProps {
  value: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  className = '',
  style
}) => {
  const str = String(value);
  const chars = str.split('');

  return (
    <span
      className={`inline-flex items-baseline overflow-hidden tabular-nums font-mono ${className}`}
      style={style}
      aria-label={str}
    >
      {chars.map((char, index) => {
        // Key by position from right so tens/hundreds slots stay stable if digit count grows
        const slotFromRight = chars.length - 1 - index;
        return (
          <span
            key={`slot-${slotFromRight}`}
            aria-hidden="true"
            className="relative inline-block overflow-hidden py-0.5"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${slotFromRight}-${char}`}
                initial={{ y: 18, opacity: 0, filter: 'blur(4px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: -18, opacity: 0, filter: 'blur(4px)' }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 32,
                  mass: 0.7
                }}
                className="inline-block will-change-transform"
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
};
