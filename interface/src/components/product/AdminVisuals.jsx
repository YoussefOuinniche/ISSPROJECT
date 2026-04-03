import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Activity, Sparkles } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../utils/cn';

const trendTone = {
  positive: 'border-brand/25 bg-brand/10 text-cyan-200',
  success: 'border-green-500/25 bg-green-500/10 text-green-200',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-100',
  danger: 'border-red-500/25 bg-red-500/10 text-red-200',
  neutral: 'border-white/10 bg-white/5 text-slate-200',
};

export function SectionCard({ title, subtitle, action, children, className }) {
  return (
    <Card className={className}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="admin-card-title">{title}</h3>
          {subtitle ? <p className="admin-card-copy mt-2 max-w-2xl">{subtitle}</p> : null}
        </div>
        {action || null}
      </div>
      {children}
    </Card>
  );
}

export function InsightBadge({ label, tone = 'neutral', icon = <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold', trendTone[tone] || trendTone.neutral)}>
      {icon}
      {label}
    </span>
  );
}

export function StatStrip({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="card-premium-soft p-4">
          <p className="admin-card-label">{item.label}</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="admin-card-stat text-2xl">{item.value}</p>
            {item.helper ? <span className="text-xs text-text-muted">{item.helper}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LinePlot({ data, color = '#22d3ee', area = true, className }) {
  const reduceMotion = useReducedMotion();
  const values = data.map((item) => Number(item.value || 0));
  const max = Math.max(1, ...values);
  const step = data.length > 1 ? 100 / (data.length - 1) : 100;
  const points = data.map((item, index) => `${index * step},${100 - (Number(item.value || 0) / max) * 100}`);
  const path = points.length ? `M ${points.join(' L ')}` : '';
  const areaPath = points.length ? `${path} L 100,100 L 0,100 Z` : '';

  return (
    <div className={cn('space-y-3', className)}>
      <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible">
        <defs>
          <linearGradient id={`plot-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <g>
          {[0, 25, 50, 75, 100].map((value) => (
            <line key={value} x1="0" x2="100" y1={value} y2={value} stroke="rgba(148,163,184,0.14)" strokeWidth="0.5" />
          ))}
        </g>
        {area && areaPath ? <path d={areaPath} fill={`url(#plot-${color.replace('#', '')})`} /> : null}
        <motion.path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0.2 }}
          animate={reduceMotion ? false : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="grid grid-cols-7 gap-2 text-[11px] text-text-muted">
        {data.slice(-7).map((item) => (
          <span key={`${item.label}-${item.value}`} className="truncate">{item.label}</span>
        ))}
      </div>
    </div>
  );
}

export function BarList({ items, colorClass = 'bg-cyan-400', valueFormatter = (value) => value }) {
  const max = Math.max(1, ...items.map((item) => Number(item.count || item.value || 0)));
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const raw = Number(item.count || item.value || 0);
        const width = Math.max(8, Math.round((raw / max) * 100));
        return (
          <div key={item.name}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-sm text-text-secondary">{item.name}</span>
              <span className="text-xs font-medium text-text-muted">{valueFormatter(raw, item)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/6">
              <div className={cn('h-full rounded-full', colorClass)} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HeatGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const intensity = Number(item.intensity || 0);
        const tone =
          intensity >= 80
            ? 'border-red-400/35 bg-red-500/12 text-red-100'
            : intensity >= 55
              ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
              : 'border-cyan-400/20 bg-cyan-500/8 text-cyan-100';

        return (
          <div key={item.skill} className={cn('card-premium-soft p-3', tone)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.skill}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] opacity-70">{item.domain}</p>
              </div>
              <span className="text-xs font-semibold">{item.avgGapLevel}/5</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs opacity-80">
              <span>{item.userCount} users</span>
              <span>{item.count} records</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RadialMeter({ value, label, sublabel }) {
  const normalized = Math.max(0, Math.min(100, Number(value || 0)));
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <svg viewBox="0 0 100 100" className="h-36 w-36 -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="url(#radial-stroke)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
          <defs>
            <linearGradient id="radial-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-text-primary">{normalized}%</span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{label}</span>
        </div>
      </div>
      {sublabel ? <p className="text-center text-sm text-text-muted">{sublabel}</p> : null}
    </div>
  );
}

export function ClusterMap({ clusters }) {
  const colors = ['#22d3ee', '#3b82f6', '#8b5cf6', '#f59e0b'];
  return (
    <div className="card-premium-soft relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(59,130,246,0.12),transparent_30%)]" />
      <div className="relative grid gap-4 lg:grid-cols-2">
        {clusters.map((cluster, index) => (
          <div key={cluster.name} className="card-premium-soft p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <p className="text-sm font-semibold text-text-primary">{cluster.name}</p>
              </div>
              <span className="text-xs text-text-muted">{cluster.count}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {cluster.skills.map((skill) => (
                <span key={skill.name} className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-black/25 px-2.5 py-1 text-xs text-text-secondary">
                  {skill.name}
                  <span className="text-text-muted">{skill.count}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoleDemandList({ roles }) {
  return (
    <div className="space-y-5">
      {roles.map((role) => (
        <div key={role.name} className="card-premium-soft p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">{role.name}</p>
              <p className="text-xs text-text-muted">{role.count} tracked users or journeys</p>
            </div>
            <InsightBadge label={`${role.skills[0]?.name || 'No skills'} lead`} tone="success" icon={<Sparkles className="h-3.5 w-3.5" />} />
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/7">
            {role.skills.map((skill, index) => (
              <div
                key={skill.name}
                className={cn('h-full', ['bg-cyan-400', 'bg-blue-500', 'bg-violet-500', 'bg-amber-400'][index % 4])}
                style={{ width: `${Math.max(skill.share, 6)}%` }}
                title={`${skill.name}: ${skill.share}%`}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-text-muted">
            {role.skills.map((skill) => (
              <span key={skill.name}>{skill.name} {skill.share}%</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function JourneyFlow({ journeys }) {
  return (
    <div className="space-y-4">
      {journeys.map((journey, index) => (
        <div key={`${journey.userId}-${journey.targetRole}`} className="card-premium-soft relative overflow-hidden p-4">
          {index < journeys.length - 1 ? <div className="absolute left-8 top-full h-4 w-px bg-brand/35" /> : null}
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{journey.targetRole}</p>
                  <p className="text-xs text-text-muted">{journey.userName}</p>
                </div>
                <InsightBadge label={`${journey.stageCount} stages`} tone="neutral" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-text-secondary">
                <span>{journey.nextStage || 'Awaiting next milestone'}</span>
                <span className="text-xs text-text-muted">{journey.confidence}% confidence</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
