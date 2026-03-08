import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../utils/cn';

export function Card({ className, children, ...props }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'card-premium relative overflow-hidden p-5 md:p-6',
        'before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-normal',
        'before:bg-[radial-gradient(120%_80%_at_10%_-30%,rgba(34,211,238,0.12),transparent_50%)] hover:before:opacity-100',
        className,
      )}
      {...props}
    >
      {children}
    </motion.section>
  );
}

export default Card;
