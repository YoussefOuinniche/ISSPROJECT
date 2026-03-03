import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from './Button';

export default function Drawer({ open, title, onClose, children }) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-black/65"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-[85] h-full w-[min(92vw,420px)] border-l border-border-subtle/20 bg-app-surface shadow-elevated"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 36 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 36 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Details drawer'}
          >
            <header className="flex items-center justify-between border-b border-border-subtle/15 px-4 py-3">
              <h3 className="text-base font-semibold text-text-primary">{title}</h3>
              <IconButton ariaLabel="Close drawer" onClick={onClose}>
                <X className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </header>
            <div className="h-[calc(100%-56px)] overflow-y-auto p-4">{children}</div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
