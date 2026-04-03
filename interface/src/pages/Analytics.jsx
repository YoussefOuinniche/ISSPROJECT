import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bot, Gauge, Sparkles, TrendingUp } from 'lucide-react';
import { getAdminOverview } from '../api/admin';
import {
  BarList,
  InsightBadge,
  LinePlot,
  RadialMeter,
  SectionCard,
} from '../components/product/AdminVisuals';

export default function Analytics() {
  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: getAdminOverview,
    staleTime: 1000 * 20,
  });

  const data = overviewQuery.data || {
    summary: {},
    users: { growthSeries: [] },
    aiActivity: { requestsSeries: [], health: {} },
    skills: { proficiencyDistribution: [], categoryShares: [] },
    gaps: { severityDistribution: [], distributionByRole: [], topUrgent: [] },
    trends: { directionMix: [], sources: [] },
    profiles: { averageCompletion: 0, averageAiConfidence: 0, explicitVsAi: [] },
    learningJourneys: { topRoles: [], stageDistribution: [] },
  };

  if (overviewQuery.isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
          <p className="text-sm text-text-muted">Loading SkillPulse intelligence</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <section className="card-premium p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Intelligence Drilldown
          </div>
          <h1 className="text-3xl font-semibold text-white lg:text-4xl">Deeper analytics on the live SkillPulse control dataset</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-300">
            This route focuses on comparative distributions and long-form platform indicators while the dashboard remains the operational control center.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricTile label="Profile coverage" value={`${data.profiles.profileCoverage || 0}%`} helper="Users with stored profile rows" />
          <MetricTile label="Avg AI confidence" value={`${data.profiles.averageAiConfidence || 0}%`} helper="Across persisted AI profiles" />
          <MetricTile label="Avg gap severity" value={`${data.gaps.avgSeverity || 0}/5`} helper="Across recorded skill gaps" />
          <MetricTile label="AI health" value={data.aiActivity.health?.status || 'unknown'} helper={data.aiActivity.health?.model || 'No model configured'} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="User growth over time" subtitle="New registrations across the last 14-day control window.">
            <LinePlot data={data.users.growthSeries} color="#22d3ee" />
          </SectionCard>

          <SectionCard
            title="AI request volume"
            subtitle="Persisted AI chat requests by day."
            action={<InsightBadge label={data.aiActivity.health?.status || 'unknown'} tone={data.aiActivity.health?.status === 'connected' ? 'success' : 'warning'} icon={<Bot className="h-3.5 w-3.5" />} />}
          >
            <LinePlot data={data.aiActivity.requestsSeries} color="#3b82f6" />
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <SectionCard title="Profile quality" subtitle="Completion quality and AI enrichment are shown side by side.">
            <div className="grid gap-6 lg:grid-cols-2">
              <RadialMeter value={data.profiles.averageCompletion} label="completion" sublabel="Average structured profile completion" />
              <RadialMeter value={data.profiles.averageAiConfidence} label="AI confidence" sublabel="Average stored AI profile confidence" />
            </div>
          </SectionCard>

          <SectionCard title="Profile source mix" subtitle="How much profile intelligence is explicit, inferred, or both.">
            <BarList
              items={data.profiles.explicitVsAi}
              colorClass="bg-blue-500"
              valueFormatter={(value) => `${value} users`}
            />
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Skill proficiency distribution" subtitle="Real proficiency levels mapped on user skills.">
            <BarList
              items={data.skills.proficiencyDistribution}
              colorClass="bg-violet-500"
              valueFormatter={(value) => `${value} mappings`}
            />
          </SectionCard>

          <SectionCard title="Skill category distribution" subtitle="Category concentration across mapped user skills.">
            <BarList
              items={data.skills.categoryShares}
              colorClass="bg-emerald-500"
              valueFormatter={(value) => `${value} mappings`}
            />
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard title="Gap severity" subtitle="How severe the current gap inventory is.">
            <BarList
              items={data.gaps.severityDistribution}
              colorClass="bg-amber-500"
              valueFormatter={(value) => `${value} gaps`}
            />
          </SectionCard>

          <SectionCard title="Gap distribution by role" subtitle="Roles most affected by missing skills.">
            <BarList
              items={data.gaps.distributionByRole}
              colorClass="bg-red-500"
              valueFormatter={(value) => `${value} gaps`}
            />
          </SectionCard>

          <SectionCard title="Urgent gap leaders" subtitle="Highest-severity or broadest impact skill gaps.">
            <BarList
              items={(data.gaps.topUrgent || []).map((item) => ({ name: item.skill, value: item.avgGapLevel }))}
              colorClass="bg-red-500"
              valueFormatter={(value, item) => `${value}/5 • ${item?.userCount || 0} users`}
            />
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard title="Trend directions" subtitle="Current spread of up, stable, and down demand signals.">
            <BarList
              items={data.trends.directionMix}
              colorClass="bg-cyan-400"
              valueFormatter={(value) => `${value} signals`}
            />
          </SectionCard>

          <SectionCard title="Trend sources" subtitle="Current source mix across tracked trend entries.">
            <BarList
              items={data.trends.sources}
              colorClass="bg-green-500"
              valueFormatter={(value) => `${value} entries`}
            />
          </SectionCard>

          <SectionCard title="Roadmap role demand" subtitle="Roles most frequently appearing in learning journeys.">
            <BarList
              items={data.learningJourneys.topRoles}
              colorClass="bg-blue-500"
              valueFormatter={(value) => `${value} journeys`}
            />
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <SectionCard
            title="AI service diagnostics"
            subtitle="Backend AI health and readiness."
            action={<InsightBadge label={data.aiActivity.health?.status || 'unknown'} tone={data.aiActivity.health?.status === 'connected' ? 'success' : 'warning'} icon={<Gauge className="h-3.5 w-3.5" />} />}
          >
            <div className="space-y-3 text-sm text-text-secondary">
              <DiagnosticRow label="Model" value={data.aiActivity.health?.model || 'Unavailable'} />
              <DiagnosticRow label="Enabled" value={String(Boolean(data.aiActivity.health?.enabled))} />
              <DiagnosticRow label="Requests" value={data.summary.totalAiRequests || 0} />
              <DiagnosticRow label="Tracked conversations" value={data.summary.totalAiConversations || 0} />
            </div>
          </SectionCard>

          <SectionCard title="Roadmap stage mix" subtitle="The stage names most often stored in user journeys.">
            <BarList
              items={data.learningJourneys.stageDistribution}
              colorClass="bg-violet-500"
              valueFormatter={(value) => `${value} stored stages`}
            />
          </SectionCard>
        </div>

        {overviewQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {overviewQuery.error?.message || 'Unable to load analytics'}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MetricTile({ label, value, helper }) {
  return (
    <div className="card-premium-soft p-4">
      <p className="admin-card-label">{label}</p>
      <p className="admin-card-stat mt-3 text-2xl">{value}</p>
      <p className="admin-card-copy mt-1 text-sm">{helper}</p>
    </div>
  );
}

function DiagnosticRow({ label, value }) {
  return (
    <div className="card-premium-soft flex items-center justify-between gap-3 px-4 py-3">
      <span>{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
