import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpenCheck,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  createSkill,
  createTrend,
  deleteSkill,
  deleteTrend,
  getAdminOverview,
  getSkillCategories,
  getSkills,
  getTrendDomains,
  getTrends,
  refreshAdminTrendSignals,
  updateSkill,
  updateTrend,
} from '../api/admin';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { BarList } from '../components/product/AdminVisuals';

const initialSkillForm = { id: '', name: '', category: '' };
const initialTrendForm = { id: '', title: '', domain: '', source: '', description: '' };

export default function Content() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('skills');
  const [searchQuery, setSearchQuery] = useState('');
  const [skillForm, setSkillForm] = useState(initialSkillForm);
  const [trendForm, setTrendForm] = useState(initialTrendForm);

  const overviewQuery = useQuery({ queryKey: ['admin-overview'], queryFn: getAdminOverview, staleTime: 1000 * 20 });
  const skillsQuery = useQuery({ queryKey: ['skills-catalog'], queryFn: () => getSkills({ limit: 400 }), staleTime: 1000 * 20 });
  const categoriesQuery = useQuery({ queryKey: ['skill-categories'], queryFn: getSkillCategories, staleTime: 1000 * 60 });
  const trendsQuery = useQuery({ queryKey: ['trends-catalog'], queryFn: () => getTrends({ limit: 240 }), staleTime: 1000 * 20 });
  const domainsQuery = useQuery({ queryKey: ['trend-domains'], queryFn: getTrendDomains, staleTime: 1000 * 60 });

  const skills = skillsQuery.data || [];
  const trends = trendsQuery.data || [];
  const overview = overviewQuery.data || { learningJourneys: { recentJourneys: [], topRoles: [], stageDistribution: [] }, trends: { topSignals: [] } };

  const filteredSkills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return skills.filter((skill) => {
      if (!query) return true;
      return (
        skill.name?.toLowerCase().includes(query) ||
        skill.category?.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, skills]);

  const filteredTrends = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return trends.filter((trend) => {
      if (!query) return true;
      return (
        trend.title?.toLowerCase().includes(query) ||
        trend.domain?.toLowerCase().includes(query) ||
        trend.source?.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, trends]);

  const skillMutation = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? updateSkill({ id: payload.id, patch: { name: payload.name, category: payload.category } })
        : createSkill({ name: payload.name, category: payload.category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success(skillForm.id ? 'Skill updated' : 'Skill created');
      setSkillForm(initialSkillForm);
    },
    onError: (error) => toast.error(error?.message || 'Unable to save skill'),
  });

  const deleteSkillMutation = useMutation({
    mutationFn: deleteSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Skill deleted');
      setSkillForm(initialSkillForm);
    },
    onError: (error) => toast.error(error?.message || 'Unable to delete skill'),
  });

  const trendMutation = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? updateTrend({ id: payload.id, patch: payload })
        : createTrend(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trends-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['trend-domains'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success(trendForm.id ? 'Trend updated' : 'Trend created');
      setTrendForm(initialTrendForm);
    },
    onError: (error) => toast.error(error?.message || 'Unable to save trend'),
  });

  const deleteTrendMutation = useMutation({
    mutationFn: deleteTrend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trends-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['trend-domains'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Trend deleted');
      setTrendForm(initialTrendForm);
    },
    onError: (error) => toast.error(error?.message || 'Unable to delete trend'),
  });

  const refreshSignals = useMutation({
    mutationFn: refreshAdminTrendSignals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Trend signals refreshed');
    },
    onError: (error) => toast.error(error?.message || 'Unable to refresh trend signals'),
  });

  useEffect(() => {
    if (activeTab === 'skills' && !skillForm.id && skills[0]) {
      setSkillForm((current) => (current.id ? current : { id: '', name: '', category: '' }));
    }
  }, [activeTab, skillForm.id, skills]);

  return (
    <div className="min-h-screen bg-app px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <section className="card-premium p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Skills & Trends Management
              </div>
              <h1 className="text-3xl font-semibold text-white lg:text-4xl">Manage the platform intelligence catalog</h1>
              <p className="mt-3 max-w-3xl text-base text-slate-300">
                Maintain the skills catalog, curate trend entries, and inspect generated learning journeys without leaving the existing admin web.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => refreshSignals.mutate()} loading={refreshSignals.isPending} icon={<RefreshCcw className="h-4 w-4" aria-hidden="true" />}>
                Refresh trend signals
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryTile label="Skills" value={skills.length} helper="Catalog entries" />
          <SummaryTile label="Trend entries" value={trends.length} helper="Tracked market signals" />
          <SummaryTile label="Roadmaps" value={overview.learningJourneys?.total || 0} helper="Stored learning journeys" />
          <SummaryTile label="Demand signals" value={overview.trends?.topSignals?.length || 0} helper="Visible trend outputs" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {[
            ['skills', 'Skills'],
            ['trends', 'Trends'],
            ['journeys', 'Journeys'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === value
                  ? 'border-brand/30 bg-brand/12 text-cyan-100'
                  : 'border-white/10 bg-white/[0.03] text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
          <input
            type="text"
            placeholder={activeTab === 'journeys' ? 'Search roadmap role or user' : 'Search name, category, source'}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="ml-auto min-w-[280px] rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand/45 focus:outline-none"
          />
        </div>

        {activeTab === 'skills' ? (
          <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <CatalogPanel
              title="Skills catalog"
              items={filteredSkills}
              selectedId={skillForm.id}
              onSelect={(skill) => setSkillForm({ id: skill.id, name: skill.name || '', category: skill.category || '' })}
              renderMeta={(skill) => skill.category || 'Uncategorized'}
            />

            <div className="space-y-6">
              <EditorPanel
                title={skillForm.id ? 'Edit skill' : 'Create skill'}
                description="Update the shared skill taxonomy used by profiles, gaps, and AI guidance."
              >
                <div className="space-y-4">
                  <Field label="Skill name">
                    <input
                      value={skillForm.name}
                      onChange={(event) => setSkillForm((current) => ({ ...current, name: event.target.value }))}
                      className="field-input"
                      placeholder="TypeScript"
                    />
                  </Field>
                  <Field label="Category">
                    <input
                      list="skill-categories"
                      value={skillForm.category}
                      onChange={(event) => setSkillForm((current) => ({ ...current, category: event.target.value }))}
                      className="field-input"
                      placeholder="Programming"
                    />
                    <datalist id="skill-categories">
                      {(categoriesQuery.data || []).map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </Field>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => skillMutation.mutate(skillForm)}
                      loading={skillMutation.isPending}
                      disabled={!skillForm.name.trim()}
                      icon={<Save className="h-4 w-4" aria-hidden="true" />}
                    >
                      {skillForm.id ? 'Save skill' : 'Create skill'}
                    </Button>
                    <Button
                      onClick={() => setSkillForm(initialSkillForm)}
                      variant="secondary"
                      icon={<Plus className="h-4 w-4" aria-hidden="true" />}
                    >
                      New
                    </Button>
                    {skillForm.id ? (
                      <Button
                        onClick={() => deleteSkillMutation.mutate(skillForm.id)}
                        variant="danger"
                        loading={deleteSkillMutation.isPending}
                        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </EditorPanel>

              <EditorPanel title="Skill category distribution" description="Distribution of mapped skills currently used across SkillPulse user profiles.">
                <BarList
                  items={overview.skills?.categoryShares || []}
                  valueFormatter={(value) => `${value} mappings`}
                />
              </EditorPanel>
            </div>
          </div>
        ) : null}

        {activeTab === 'trends' ? (
          <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <CatalogPanel
              title="Trend catalog"
              items={filteredTrends}
              selectedId={trendForm.id}
              onSelect={(trend) =>
                setTrendForm({
                  id: trend.id,
                  title: trend.title || '',
                  domain: trend.domain || '',
                  source: trend.source || '',
                  description: trend.description || '',
                })
              }
              renderMeta={(trend) => `${trend.domain || 'General'} • ${trend.source || 'No source'}`}
            />

            <div className="space-y-6">
              <EditorPanel
                title={trendForm.id ? 'Edit trend' : 'Create trend'}
                description="Curate market intelligence that feeds dashboard signals and recommendation context."
              >
                <div className="space-y-4">
                  <Field label="Trend title">
                    <input
                      value={trendForm.title}
                      onChange={(event) => setTrendForm((current) => ({ ...current, title: event.target.value }))}
                      className="field-input"
                      placeholder="Platform engineering rise"
                    />
                  </Field>
                  <Field label="Domain">
                    <input
                      list="trend-domains"
                      value={trendForm.domain}
                      onChange={(event) => setTrendForm((current) => ({ ...current, domain: event.target.value }))}
                      className="field-input"
                      placeholder="DevOps"
                    />
                    <datalist id="trend-domains">
                      {(domainsQuery.data || []).map((domain) => (
                        <option key={domain} value={domain} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Source">
                    <input
                      value={trendForm.source}
                      onChange={(event) => setTrendForm((current) => ({ ...current, source: event.target.value }))}
                      className="field-input"
                      placeholder="CNCF Survey 2025"
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      value={trendForm.description}
                      onChange={(event) => setTrendForm((current) => ({ ...current, description: event.target.value }))}
                      className="field-input min-h-[140px] resize-y"
                      placeholder="Describe the observed demand signal..."
                    />
                  </Field>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => trendMutation.mutate(trendForm)}
                      loading={trendMutation.isPending}
                      disabled={!trendForm.title.trim()}
                      icon={<Save className="h-4 w-4" aria-hidden="true" />}
                    >
                      {trendForm.id ? 'Save trend' : 'Create trend'}
                    </Button>
                    <Button onClick={() => setTrendForm(initialTrendForm)} variant="secondary" icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                      New
                    </Button>
                    {trendForm.id ? (
                      <Button
                        onClick={() => deleteTrendMutation.mutate(trendForm.id)}
                        variant="danger"
                        loading={deleteTrendMutation.isPending}
                        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </EditorPanel>

              <EditorPanel title="Current trend signals" description="Signals are generated from stored trends and related skills.">
                {(overview.trends?.topSignals || []).length === 0 ? (
                  <p className="text-sm text-text-muted">No trend signals available yet. Refresh the signal set to derive the first demand map.</p>
                ) : (
                  <BarList
                    items={(overview.trends?.topSignals || []).map((item) => ({ name: item.skill, value: item.demandScore }))}
                    colorClass="bg-emerald-500"
                    valueFormatter={(value, item) => `${value}/100${item?.trend ? ` • ${item.trend}` : ''}`}
                  />
                )}
              </EditorPanel>
            </div>
          </div>
        ) : null}

        {activeTab === 'journeys' ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <EditorPanel title="Recent learning journeys" description="Read-only roadmap oversight based on persisted user AI profiles.">
              <div className="space-y-3">
                {(overview.learningJourneys?.recentJourneys || [])
                  .filter((item) => {
                    const query = searchQuery.trim().toLowerCase();
                    if (!query) return true;
                    return (
                      item.targetRole?.toLowerCase().includes(query) ||
                      item.userName?.toLowerCase().includes(query)
                    );
                  })
                  .map((journey) => (
                    <div key={`${journey.userId}-${journey.targetRole}`} className="card-premium-soft p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{journey.targetRole}</p>
                          <p className="text-xs text-text-muted">{journey.userName}</p>
                        </div>
                        <span className="text-xs text-text-muted">{journey.stageCount} stages</span>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">{journey.nextStage || 'No next stage identified yet.'}</p>
                    </div>
                  ))}
                {(overview.learningJourneys?.recentJourneys || []).length === 0 ? (
                  <p className="text-sm text-text-muted">No persisted learning journeys are available yet.</p>
                ) : null}
              </div>
            </EditorPanel>

            <div className="space-y-6">
              <EditorPanel title="Top roadmap roles" description="Roles most frequently selected in generated learning paths.">
                <BarList
                  items={overview.learningJourneys?.topRoles || []}
                  valueFormatter={(value) => `${value} journeys`}
                />
              </EditorPanel>

              <EditorPanel title="Roadmap stage distribution" description="The most common stage names currently stored in user learning journeys.">
                <BarList
                  items={overview.learningJourneys?.stageDistribution || []}
                  colorClass="bg-violet-500"
                  valueFormatter={(value) => `${value} stages`}
                />
              </EditorPanel>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, helper }) {
  return (
    <div className="card-premium-soft p-4">
      <p className="admin-card-label">{label}</p>
      <p className="admin-card-stat mt-3 text-2xl">{value}</p>
      <p className="admin-card-copy mt-1 text-sm">{helper}</p>
    </div>
  );
}

function CatalogPanel({ title, items, selectedId, onSelect, renderMeta }) {
  return (
    <div className="card-premium p-5">
      <h2 className="admin-card-title mb-4">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className={`w-full p-4 text-left transition-all ${
                selected
                  ? 'card-premium-soft border-brand/30'
                  : 'card-premium-soft hover:border-white/15'
              }`}
            >
              <p className="text-sm font-semibold text-text-primary">{item.name || item.title}</p>
              <p className="mt-1 text-sm text-text-muted">{renderMeta(item)}</p>
            </button>
          );
        })}
        {items.length === 0 ? (
          <div className="card-premium-soft border-dashed px-5 py-12 text-center text-sm text-text-muted">
            No records match the current search.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EditorPanel({ title, description, children }) {
  return (
    <div className="card-premium p-5">
      <h2 className="admin-card-title">{title}</h2>
      <p className="admin-card-copy mt-2 text-sm">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
