import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../utils/cn';

const toneClasses = {
  primary: 'text-brand border-brand/30 bg-brand/10',
  success: 'text-green-300 border-green-500/35 bg-green-500/10',
  warning: 'text-amber-300 border-amber-500/35 bg-amber-500/10',
  danger: 'text-red-300 border-red-500/35 bg-red-500/10',
};

export default function KpiTile({
  title,
  value,
  change,
  changeLabel,
  icon,
  tone = 'primary',
  onClick,
}) {
  return (
    <Card
      className={cn('group cursor-pointer p-5', onClick ? 'hover:border-brand/45' : 'cursor-default')}
      onClick={onClick}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border-subtle/20 bg-app-elevated text-brand">
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{icon}</span>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
            toneClasses[tone] || toneClasses.primary,
          )}
        >
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          {change || '0%'}
        </span>
      </div>

      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{title}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-text-primary">{value}</p>
      <p className="mt-2 text-sm text-text-secondary">{changeLabel || 'No period comparison available'}</p>
    </Card>
  );
}
