import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Dropdown({ triggerLabel, ariaLabel, items = [], className }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel || 'Open menu'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-subtle/20 bg-app-elevated px-3 text-sm text-text-secondary transition-all duration-normal hover:border-border-subtle/35 hover:text-text-primary"
      >
        <span>{triggerLabel}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-fast', open && 'rotate-180')} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -2 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-border-subtle/20 bg-app-surface p-1 shadow-elevated"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors duration-fast hover:bg-white/[0.05] hover:text-text-primary"
              >
                {item.icon ? <span className="text-text-muted">{item.icon}</span> : null}
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
