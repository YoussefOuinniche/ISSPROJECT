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
        'card-premium overflow-hidden p-5 md:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </motion.section>
  );
}

export default Card;
