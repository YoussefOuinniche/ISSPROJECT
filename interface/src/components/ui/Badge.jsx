import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  brand: 'bg-brand/15 text-cyan-200 border-brand/35',
  neutral: 'bg-white/[0.04] text-text-secondary border-border-subtle/20',
  success: 'bg-success/15 text-green-200 border-success/30',
  warn: 'bg-warn/15 text-amber-200 border-warn/30',
  danger: 'bg-danger/15 text-red-200 border-danger/30',
};

export default function Badge({ variant = 'neutral', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[12px] leading-none font-medium border',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
