import React from 'react';
import { cn } from '../../utils/cn';

export default function Skeleton({ className }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-white/[0.06] border border-white/[0.04]',
        className,
      )}
      aria-hidden="true"
    />
  );
}
