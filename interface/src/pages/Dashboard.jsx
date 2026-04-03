import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  RefreshCcw,
  Route,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { getAdminOverview, refreshAdminTrendSignals } from '../api/admin';
import Button from '../components/ui/Button';
import KpiTile from '../components/product/KpiTile';
import { useToast } from '../components/ui/Toast';
import {
  BarList,
  ClusterMap,
  HeatGrid,
  InsightBadge,
  JourneyFlow,
  LinePlot,
  RadialMeter,
  RoleDemandList,
  SectionCard,
  StatStrip,
} from '../components/product/AdminVisuals';

const emptyOverview = {
  hero: { headline: 'Loading SkillPulse control intelligence', subheadline: '', insights: [] },
  summary: {},
  kpis: [],
  users: { growthSeries: [], recentUsers: [], targetRoles: [] },
  aiActivity: { requestsSeries: [], hourlyRequests: [], peakHour: { label: '00:00', value: 0 }, health: { status: 'unknown' } },
  skills: { topSkills: [], categoryShares: [], clusters: [], topAiDetectedSkills: [], proficiencyDistribution: [] },
  gaps: { heatmap: [], topUrgent: [], severityDistribution: [], distributionByRole: [], avgSeverity: 0 },
  trends: { topSignals: [], directionMix: [], sources: [] },
  profiles: { averageCompletion: 0, averageAiConfidence: 0, explicitVsAi: [], evolutionStages: [] },
  learningJourneys: { recentJourneys: [], topRoles: [] },
  roleDemand: [],
};

function formatDelta(value) {
  const numeric = Number(value || 0);
  return `${numeric >= 0 ? '+' : ''}${numeric}%`;
}

function mapTone(value) {
  if (value === 'success') return 'success';
  if (value === 'warning') return 'warning';
  if (value === 'danger') return 'danger';
  return 'primary';
}

function insightActionProps(insight, refreshSignals, isPending) {
  if (insight.id === 'trend-refresh') {
    return {
      type: 'button',
      onClick: refreshSignals,
      disabled: isPending,
      label: isPending ? 'Refreshing...' : insight.action,
    };
  }

  return {
    type: 'link',
    to: insight.id === 'urgent-gaps' ? '/users' : '/analytics',
    label: insight.action,
  };
}

export default function Dashboard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: getAdminOverview,
    staleTime: 1000 * 20,
  });

  const refreshSignals = useMutation({
    mutationFn: refreshAdminTrendSignals,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success(`Trend signals refreshed${data?.persisted ? ' and persisted' : ''}`);
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to refresh trend signals');
    },
  });

  const data = overviewQuery.data || emptyOverview;

  if (overviewQuery.isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
          <p className="text-sm text-text-muted">Loading admin control center</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <section className="card-premium relative overflow-hidden p-6 lg:p-8">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-500/16 blur-[120px]" />
          <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-blue-500/16 blur-[120px]" />
          <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <InsightBadge label="SkillPulse Admin Control Center" tone="success" icon={<BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />} />
                <InsightBadge label={`${data.summary.totalUsers || 0} monitored users`} tone="neutral" />
              </div>
              <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-white lg:text-5xl">
                {data.hero.headline}
              </h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 lg:text-lg">
                {data.hero.subheadline}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={() => refreshSignals.mutate()} loading={refreshSignals.isPending} icon={<RefreshCcw className="h-4 w-4" aria-hidden="true" />}>
                  Refresh trend signals
                </Button>
                <Link to="/users" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-subtle/25 bg-app-elevated px-4 text-sm font-semibold text-text-primary transition-all duration-normal hover:-translate-y-0.5 hover:border-brand/45">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Inspect talent pool
                </Link>
              </div>

              <div className="mt-8">
                <StatStrip
                  items={[
                    { label: 'Active users', value: data.summary.activeUsers || 0, helper: 'last 30 days' },
                    { label: 'AI requests', value: data.summary.totalAiRequests || 0, helper: 'persisted chat messages' },
                    { label: 'Urgent gaps', value: data.summary.urgentSkillGaps || 0, helper: 'gap level 4+' },
                    { label: 'Roadmaps', value: data.summary.roadmapCount || 0, helper: 'stored learning journeys' },
                  ]}
                />
              </div>
            </div>

            <div className="grid gap-3 self-start">
              {data.hero.insights.map((insight) => {
                const action = insightActionProps(insight, () => refreshSignals.mutate(), refreshSignals.isPending);
                return (
                  <div key={insight.id} className="card-premium-soft p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{insight.title}</p>
                        <p className="mt-1 text-sm text-text-muted">{insight.description}</p>
                      </div>
                      <InsightBadge label={insight.tone} tone={insight.tone} />
                    </div>
                    {action.type === 'button' ? (
                      <Button variant="ghost" className="w-full justify-between" onClick={action.onClick} disabled={action.disabled}>
                        {action.label}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : (
                      <Link to={action.to} className="inline-flex h-10 w-full items-center justify-between rounded-xl border border-border-subtle/20 px-4 text-sm font-semibold text-text-secondary transition-all duration-normal hover:bg-white/[0.04] hover:text-text-primary hover:border-border-subtle/35">
                        <span>{action.label}</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.kpis.map((item) => (
            <KpiTile
              key={item.id}
              title={item.label}
              value={item.value}
              change={formatDelta(item.delta)}
              changeLabel={item.deltaLabel}
              icon={item.icon}
              tone={mapTone(item.tone)}
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <SectionCard title="Skill intelligence map" subtitle="Clusters are built from the real user-skill graph inside SkillPulse.">
            <ClusterMap clusters={data.skills.clusters} />
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold text-text-primary">Most common platform skills</p>
                <BarList
                  items={data.skills.topSkills.map((item) => ({ name: item.name, count: item.count }))}
                  valueFormatter={(value, item) => `${value} mappings${item?.users ? ` • ${item.users} users` : ''}`}
                />
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold text-text-primary">AI-detected skills</p>
                <BarList
                  items={data.skills.topAiDetectedSkills}
                  colorClass="bg-violet-500"
                  valueFormatter={(value) => `${value} AI profiles`}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="System pulse"
            subtitle="AI workload, demand peaks, and backend readiness."
            action={<InsightBadge label={data.aiActivity.health?.status || 'unknown'} tone={data.aiActivity.health?.status === 'connected' ? 'success' : 'warning'} icon={<Activity className="h-3.5 w-3.5" />} />}
          >
            <LinePlot data={data.aiActivity.requestsSeries} />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <PulseStat label="Peak hour" value={data.aiActivity.peakHour?.label || '00:00'} helper={`${data.aiActivity.peakHour?.value || 0} requests`} />
              <PulseStat label="Avg requests / user" value={data.aiActivity.avgRequestsPerUser || 0} helper={`${data.aiActivity.totalConversations || 0} active AI users`} />
              <PulseStat label="Tracked conversations" value={data.aiActivity.totalConversations || 0} helper="Distinct users with chat history" />
              <PulseStat label="AI model" value={data.aiActivity.health?.model || 'Not configured'} helper={data.aiActivity.health?.enabled ? 'Live backend check' : 'AI disabled'} />
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Skill gap heatmap" subtitle="Each cell reflects real gap severity and the number of affected users.">
            <HeatGrid items={data.gaps.heatmap} />
          </SectionCard>

          <SectionCard title="Profile intelligence" subtitle="Explicit profile data, inferred AI confidence, and completion quality.">
            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <RadialMeter value={data.profiles.averageCompletion} label="completion" sublabel={`${data.profiles.completedCareerProfiles || 0} users have strong career profiles`} />
              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-semibold text-text-primary">Explicit vs AI-enriched profiles</p>
                  <BarList items={data.profiles.explicitVsAi} colorClass="bg-blue-500" valueFormatter={(value) => `${value} users`} />
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-text-primary">Profile evolution</p>
                  <div className="space-y-3">
                    {data.profiles.evolutionStages.map((stage) => (
                      <div key={stage.id} className="card-premium-soft p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{stage.title}</p>
                            <p className="text-xs text-text-muted">{stage.time}</p>
                          </div>
                          <span className="text-xs text-text-muted">{stage.count}</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <MetricBar label="Structured profile" value={stage.metrics.skill} colorClass="bg-cyan-400" />
                          <MetricBar label="AI confidence" value={stage.metrics.ai} colorClass="bg-violet-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Role intelligence" subtitle="Demand is inferred from stored target roles and active learning journeys.">
            <RoleDemandList roles={data.roleDemand} />
          </SectionCard>

          <SectionCard title="Learning path flow" subtitle="Recent learning journeys generated and persisted for SkillPulse users.">
            <JourneyFlow journeys={data.learningJourneys.recentJourneys} />
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Trend signals" subtitle="Persisted or derived skill trend signals tied to the current backend dataset.">
            {data.trends.topSignals.length === 0 ? (
              <EmptyBlock
                icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
                title="No trend signals yet"
                body="Use the refresh action to derive skill trend signals from the current trend catalog and related skills."
              />
            ) : (
              <BarList
                items={data.trends.topSignals.map((item) => ({ name: item.skill, value: item.demandScore }))}
                colorClass="bg-emerald-500"
                valueFormatter={(value, item) => `${value}/100${item?.trend ? ` • ${item.trend}` : ''}`}
              />
            )}
          </SectionCard>

          <SectionCard title="Recent user intake" subtitle="Newly registered users with completion coverage for fast admin triage.">
            <div className="space-y-3">
              {data.users.recentUsers.map((user) => (
                <div key={user.id} className="card-premium-soft flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{user.name}</p>
                    <p className="text-xs text-text-muted">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{user.role}</p>
                    <p className="text-sm text-text-secondary">{user.completion}% complete</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {overviewQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {overviewQuery.error?.message || 'Unable to load control center data'}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PulseStat({ label, value, helper }) {
  return (
    <div className="card-premium-soft p-4">
      <p className="admin-card-label">{label}</p>
      <p className="admin-card-stat mt-3 text-xl">{value}</p>
      <p className="admin-card-copy mt-1 text-sm">{helper}</p>
    </div>
  );
}

function MetricBar({ label, value, colorClass }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-xs text-text-muted">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/6">
        <div className={cn('h-full rounded-full', colorClass)} style={{ width: `${Math.max(6, value)}%` }} />
      </div>
    </div>
  );
}

function EmptyBlock({ icon, title, body }) {
  return (
    <div className="card-premium-soft flex min-h-[220px] flex-col items-center justify-center border-dashed px-6 text-center">
      <div className="card-premium-soft mb-4 flex h-12 w-12 items-center justify-center text-brand">
        {icon}
      </div>
      <p className="text-base font-semibold text-text-primary">{title}</p>
      <p className="mt-2 max-w-md text-sm text-text-muted">{body}</p>
    </div>
  );
}

function cn(...values) {
  return values.filter(Boolean).join(' ');
}
