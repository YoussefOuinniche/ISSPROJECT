import React, { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function Tooltip({ content, children, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const id = useId();

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
      aria-describedby={isOpen ? id : undefined}
    >
      {children}
      <AnimatePresence>
        {isOpen && content ? (
          <motion.span
            id={id}
            role="tooltip"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: -2 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 2 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-border-subtle/20 bg-app-elevated px-2 py-1 text-[11px] text-text-secondary shadow-subtle"
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
