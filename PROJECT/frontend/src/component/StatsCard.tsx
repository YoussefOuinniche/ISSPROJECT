import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ChangeType } from "@/types";

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: ChangeType;
  icon: LucideIcon;
}

const trendIcon = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
};

const trendColor = {
  positive: "text-emerald-500",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
};

export function StatsCard({ title, value, change, changeType, icon: Icon }: StatsCardProps) {
  const TrendIcon = trendIcon[changeType];

  return (
    <div className="card-3d glow-primary-hover relative overflow-hidden rounded-xl border bg-card p-5 transition-default">
      {/* Subtle top gradient accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-bold tabular-nums tracking-tight leading-none">
            {value}
          </p>
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor[changeType]}`}>
            <TrendIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{change}</span>
          </div>
        </div>

        {/* Icon with gradient background */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/15">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          {/* Glow dot */}
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse-ring" />
        </div>
      </div>
    </div>
  );
}
