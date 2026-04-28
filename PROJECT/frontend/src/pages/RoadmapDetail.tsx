import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Flame, CheckCircle2, Circle,
  Clock, User, AlertTriangle, Trophy, Calendar,
  ChevronRight, Zap,
} from "lucide-react";
import { Button } from "@/component/ui/button";
import { Badge } from "@/component/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/component/ui/card";
import { Progress } from "@/component/ui/progress";
import { roadmapService, userService } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ── Streak helpers ──────────────────────────────────────────────────────────── */

function daysBetween(a: Date, b: Date) {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function computeStreak(steps: any[]) {
  const completedDays = new Set(
    steps
      .filter((s) => s.completed_at)
      .map((s) => new Date(s.completed_at).toDateString())
  );

  if (completedDays.size === 0) return { current: 0, longest: 0, lastActivity: null as Date | null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Walk backwards from today (or yesterday) counting consecutive days
  let current = 0;
  let d = new Date(today);
  while (completedDays.has(d.toDateString())) {
    current++;
    d.setDate(d.getDate() - 1);
  }
  if (current === 0) {
    // try starting from yesterday (user hasn't done anything today yet)
    d = new Date(today);
    d.setDate(d.getDate() - 1);
    while (completedDays.has(d.toDateString())) {
      current++;
      d.setDate(d.getDate() - 1);
    }
  }

  // Longest streak
  const sorted = [...completedDays]
    .map((s) => new Date(s))
    .sort((a, b) => a.getTime() - b.getTime());
  let longest = sorted.length > 0 ? 1 : 0;
  let temp = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = daysBetween(sorted[i - 1], sorted[i]);
    if (diff === 1) { temp++; longest = Math.max(longest, temp); }
    else temp = 1;
  }

  const lastActivity = sorted.at(-1) ?? null;
  return { current, longest, lastActivity };
}

/* ── Status styles ───────────────────────────────────────────────────────────── */

const STATUS_STEP: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  completed:   { label: "Done",        icon: CheckCircle2, cls: "text-emerald-500" },
  in_progress: { label: "In Progress", icon: ChevronRight, cls: "text-amber-400"   },
  pending:     { label: "Pending",     icon: Circle,       cls: "text-muted-foreground/50" },
};

/* ── Component ───────────────────────────────────────────────────────────────── */

export default function RoadmapDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: roadmap, isLoading } = useQuery({
    queryKey: ["roadmap", id],
    queryFn: () => roadmapService.getById(id!),
    enabled: !!id,
  });

  const { data: owner } = useQuery({
    queryKey: ["user", roadmap?.profile_id],
    queryFn: () => userService.getById(roadmap!.profile_id),
    enabled: !!roadmap?.profile_id,
  });

  const stepMutation = useMutation({
    mutationFn: ({ stepId, status }: { stepId: string; status: string }) =>
      roadmapService.updateStep(stepId, {
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmap", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => roadmapService.updateStatus(id!, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap", id] });
      toast.success("Roadmap status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-56 rounded-xl" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground">Roadmap not found</p>
        <Button variant="outline" onClick={() => navigate("/roadmaps")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const steps: any[] = roadmap.steps ?? [];
  const total     = steps.length;
  const completed = steps.filter((s) => s.status === "completed").length;
  const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;

  const { current: streakCurrent, longest: streakLongest, lastActivity } = computeStreak(steps);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceLast = lastActivity ? daysBetween(lastActivity, today) : null;
  const INACTIVE_THRESHOLD = 7;
  const isAtRisk = roadmap.status === "active" && (daysSinceLast === null || daysSinceLast >= INACTIVE_THRESHOLD);

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Back + title */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-0.5 flex-shrink-0" onClick={() => navigate("/roadmaps")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{roadmap.title}</h1>
            <Badge
              variant={roadmap.status === "completed" ? "default" : roadmap.status === "active" ? "secondary" : "outline"}
              className="capitalize"
            >
              {roadmap.status ?? "pending"}
            </Badge>
            {isAtRisk && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/8">
                <AlertTriangle className="h-3 w-3 mr-1" /> At Risk
              </Badge>
            )}
          </div>
          {roadmap.summary && (
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{roadmap.summary}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Progress */}
        <Card className="overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <CardContent className="p-4 space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Progress</p>
            <p className="text-2xl font-bold tabular-nums">{progress}%</p>
            <Progress value={progress} className="h-1.5" />
          </CardContent>
        </Card>

        {/* Streak */}
        <Card className="overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Current Streak</p>
            <div className="flex items-center gap-1.5">
              <Flame className={cn("h-5 w-5", streakCurrent > 0 ? "text-amber-400" : "text-muted-foreground/40")} />
              <p className="text-2xl font-bold tabular-nums">{streakCurrent}</p>
              <span className="text-xs text-muted-foreground">days</span>
            </div>
          </CardContent>
        </Card>

        {/* Longest streak */}
        <Card className="overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Best Streak</p>
            <div className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-primary/60" />
              <p className="text-2xl font-bold tabular-nums">{streakLongest}</p>
              <span className="text-xs text-muted-foreground">days</span>
            </div>
          </CardContent>
        </Card>

        {/* Last activity */}
        <Card className="overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Last Activity</p>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary/60" />
              <p className="text-sm font-semibold tabular-nums">
                {lastActivity
                  ? daysSinceLast === 0 ? "Today"
                    : daysSinceLast === 1 ? "Yesterday"
                    : `${daysSinceLast}d ago`
                  : "Never"}
              </p>
            </div>
            {isAtRisk && lastActivity && (
              <p className="text-[10px] text-amber-500">Inactive ≥ {INACTIVE_THRESHOLD} days</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Steps ── */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">
            Steps · {completed}/{total} complete
          </h2>

          {steps.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No steps defined yet.
              </CardContent>
            </Card>
          ) : (
            steps.map((step, idx) => {
              const meta = STATUS_STEP[step.status] ?? STATUS_STEP.pending;
              const StepIcon = meta.icon;
              const isDone = step.status === "completed";

              return (
                <div
                  key={step.id}
                  className={cn(
                    "relative flex items-start gap-4 rounded-xl border p-4 transition-all duration-200",
                    isDone
                      ? "border-emerald-500/20 bg-emerald-500/4"
                      : "border-border bg-card hover:border-border/80",
                  )}
                  style={{ animationDelay: `${idx * 35}ms` }}
                >
                  {/* Step number connector */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                    <div className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-bold transition-colors",
                      isDone
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                        : "border-border bg-background text-muted-foreground",
                    )}>
                      {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{step.step_order ?? idx + 1}</span>}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={cn("w-px h-4 mt-1", isDone ? "bg-emerald-500/30" : "bg-border/60")} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn("text-sm font-semibold", isDone && "line-through text-muted-foreground/70")}>
                          {step.title}
                        </p>
                        {step.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{step.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {step.skills?.name && (
                            <span className="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 font-medium"
                              style={{ background: "hsl(var(--primary)/0.1)", color: "hsl(var(--primary))" }}>
                              <Zap className="h-2.5 w-2.5" />{step.skills.name}
                            </span>
                          )}
                          {step.courses?.title && (
                            <span className="inline-flex items-center gap-1 text-[11px] rounded-full border px-2 py-0.5 font-medium text-muted-foreground">
                              {step.courses.title}
                            </span>
                          )}
                          {step.completed_at && (
                            <span className="text-[11px] text-muted-foreground/60">
                              Done {new Date(step.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Toggle button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 px-2.5 text-xs flex-shrink-0 rounded-lg transition-colors",
                          isDone
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-emerald-500 hover:bg-emerald-500/10",
                        )}
                        disabled={stepMutation.isPending}
                        onClick={() =>
                          stepMutation.mutate({
                            stepId: step.id,
                            status: isDone ? "pending" : "completed",
                          })
                        }
                      >
                        {isDone ? "Undo" : "Mark Done"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="space-y-4">

          {/* Owner card */}
          <Card className="overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Assigned User
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{ background: "hsl(var(--primary)/0.15)", color: "hsl(var(--primary))" }}>
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{owner?.full_name || "Unknown User"}</p>
                  {owner?.role && (
                    <p className="text-xs text-muted-foreground capitalize">{owner.role}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roadmap meta */}
          <Card className="overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <CardContent className="p-5 space-y-3">
              {roadmap.estimated_weeks && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Duration
                  </span>
                  <span className="text-sm font-semibold">{roadmap.estimated_weeks}w</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Steps done</span>
                <span className="text-sm font-semibold">{completed} / {total}</span>
              </div>
              {roadmap.created_at && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-xs font-medium">{new Date(roadmap.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inactive warning + action */}
          {isAtRisk && roadmap.status === "active" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/6 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-500">Inactive Roadmap</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    No activity for {daysSinceLast ?? "∞"} days. Consider marking it inactive.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10 text-xs"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate("inactive")}
              >
                Mark as Inactive
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
